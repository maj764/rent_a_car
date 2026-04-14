using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RentACar.API.Data;
using RentACar.API.DTOs;
using RentACar.API.Models;

namespace RentACar.API.Controllers;

[ApiController]
[Route("api/rezervacije")]
[Authorize]
public class RezervacijeController : ControllerBase
{
    private readonly AppDbContext _db;
    public RezervacijeController(AppDbContext db) { _db = db; }

    [HttpGet]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> GetAll()
    {
        var result = await _db.Rezervacije
            .Include(r => r.Zaposleni)
            .Include(r => r.Vozilo).ThenInclude(v => v!.Model).ThenInclude(m => m!.Znamka)
            .OrderByDescending(r => r.Zacetek)
            .Select(r => new RezervacijaResponseDto(
                r.Id, r.Zacetek, r.Konec, r.Status, r.Opis,
                r.Zaposleni!.Ime + " " + r.Zaposleni.Priimek,
                r.Vozilo!.Registrska,
                r.Vozilo.Model!.Znamka!.Ime,
                r.Vozilo.Model.Ime))
            .ToListAsync();
        return Ok(result);
    }

    [HttpGet("moje/{zaposleniId}")]
    public async Task<IActionResult> GetMoje(int zaposleniId)
    {
        var result = await _db.Rezervacije
            .Include(r => r.Vozilo).ThenInclude(v => v!.Model).ThenInclude(m => m!.Znamka)
            .Where(r => r.ZaposleniId == zaposleniId)
            .OrderByDescending(r => r.Zacetek)
            .Select(r => new RezervacijaResponseDto(
                r.Id, r.Zacetek, r.Konec, r.Status, r.Opis,
                "",
                r.Vozilo!.Registrska,
                r.Vozilo.Model!.Znamka!.Ime,
                r.Vozilo.Model.Ime))
            .ToListAsync();
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var r = await _db.Rezervacije
            .Include(x => x.Zaposleni).ThenInclude(z => z!.Nivo)
            .Include(x => x.Vozilo).ThenInclude(v => v!.Model).ThenInclude(m => m!.Znamka)
            .Include(x => x.Vozilo).ThenInclude(v => v!.Razred)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (r == null) return NotFound();

        var km = await _db.PrevozeniKm.FirstOrDefaultAsync(p => p.RezervacijaId == id);

        return Ok(new
        {
            r.Id, r.Zacetek, r.Konec, r.Status, r.Opis,
            ZaposleniIme = r.Zaposleni!.Ime + " " + r.Zaposleni.Priimek,
            ZaposleniEmail = r.Zaposleni.Email,
            Registrska = r.Vozilo!.Registrska,
            Znamka = r.Vozilo.Model!.Znamka!.Ime,
            Model = r.Vozilo.Model.Ime,
            Razred = r.Vozilo.Razred!.Naziv,
            PrevozeniKm = km?.Skupaj
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] RezervacijaCreateDto dto)
    {
        if (dto.Zacetek >= dto.Konec)
            return BadRequest(new { message = "Datum začetka mora biti pred koncem!" });

        var zaposleni = await _db.Zaposleni.Include(z => z.Nivo)
            .FirstOrDefaultAsync(z => z.Id == dto.ZaposleniId);
        if (zaposleni == null) return BadRequest(new { message = "Zaposleni ne obstaja!" });

        var vozilo = await _db.Vozila.FindAsync(dto.VozilaId);
        if (vozilo == null) return BadRequest(new { message = "Vozilo ne obstaja!" });

        if (vozilo.Status != "na voljo")
            return BadRequest(new { message = $"Vozilo ni na voljo (status: {vozilo.Status})!" });

        if (vozilo.RazredVozilaId > zaposleni.Nivo!.MaxRazred)
            return BadRequest(new { message = "Vaš nivo ne dovoljuje tega razreda vozila!" });

        var prekrivanje = await _db.Rezervacije.AnyAsync(r =>
            r.VozilaId == dto.VozilaId &&
            r.Status != "preklicana" && r.Status != "zaključena" &&
            r.Zacetek < dto.Konec && r.Konec > dto.Zacetek);
        if (prekrivanje)
            return BadRequest(new { message = "Vozilo je v tem obdobju že rezervirano!" });

        var rez = new Rezervacija
        {
            Zacetek = dto.Zacetek,
            Konec = dto.Konec,
            Status = "aktivna",
            Opis = dto.Opis,
            ZaposleniId = dto.ZaposleniId,
            VozilaId = dto.VozilaId
        };
        _db.Rezervacije.Add(rez);
        vozilo.Status = "v najemu";
        await _db.SaveChangesAsync();
        return Ok(new { message = "Rezervacija ustvarjena.", id = rez.Id });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] RezervacijaUpdateDto dto)
    {
        var r = await _db.Rezervacije.FindAsync(id);
        if (r == null) return NotFound();
        if (r.Status != "aktivna")
            return BadRequest(new { message = "Mogoče urejati samo aktivne rezervacije!" });

        r.Zacetek = dto.Zacetek;
        r.Konec = dto.Konec;
        r.Opis = dto.Opis;
        await _db.SaveChangesAsync();
        return Ok(new { message = "Rezervacija posodobljena." });
    }

    [HttpPut("{id}/preklic")]
    public async Task<IActionResult> Preklic(int id)
    {
        var r = await _db.Rezervacije.Include(x => x.Vozilo).FirstOrDefaultAsync(x => x.Id == id);
        if (r == null) return NotFound();

        if (r.Status == "preklicana" || r.Status == "zaključena")
            return BadRequest(new { message = $"Rezervacija je že {r.Status}!" });

        r.Status = "preklicana";
        if (r.Vozilo != null) r.Vozilo.Status = "na voljo";
        await _db.SaveChangesAsync();
        return Ok(new { message = "Rezervacija preklicana." });
    }

    [HttpPut("{id}/zakljuci")]
    public async Task<IActionResult> Zakljuci(int id, [FromBody] ZakljuciDto dto)
    {
        var r = await _db.Rezervacije.Include(x => x.Vozilo).FirstOrDefaultAsync(x => x.Id == id);
        if (r == null) return NotFound();

        if (r.Status != "aktivna")
            return BadRequest(new { message = "Mogoče zaključiti samo aktivne rezervacije!" });

        if (dto.KoncniKm <= dto.ZacetniKm)
            return BadRequest(new { message = "Končni km morajo biti večji od začetnih!" });

        var skupaj = dto.KoncniKm - dto.ZacetniKm;

        _db.PrevozeniKm.Add(new PrevozeniKm
        {
            ZacetniKm = dto.ZacetniKm,
            KoncniKm = dto.KoncniKm,
            Skupaj = skupaj,
            Opombe = dto.Opombe,
            RezervacijaId = id
        });

        r.Status = "zaključena";
        if (r.Vozilo != null)
        {
            r.Vozilo.Km += skupaj;
            r.Vozilo.Status = "na voljo";
        }

        await _db.SaveChangesAsync();
        return Ok(new { message = $"Rezervacija zaključena. Prevoženi km: {skupaj}." });
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Delete(int id)
    {
        var r = await _db.Rezervacije.FindAsync(id);
        if (r == null) return NotFound();
        if (r.Status == "aktivna")
            return BadRequest(new { message = "Ne moreš izbrisati aktivne rezervacije. Najprej jo prekliči!" });
        _db.Rezervacije.Remove(r);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Rezervacija izbrisana." });
    }
}
