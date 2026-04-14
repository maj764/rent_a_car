using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RentACar.API.Data;
using RentACar.API.DTOs;
using RentACar.API.Models;

namespace RentACar.API.Controllers;

[ApiController]
[Route("api/servisi")]
[Authorize]
public class ServisiController : ControllerBase
{
    private readonly AppDbContext _db;
    public ServisiController(AppDbContext db) { _db = db; }

    [HttpGet]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> GetAll()
    {
        var result = await _db.Servisi
            .Include(s => s.Vozilo).ThenInclude(v => v!.Model).ThenInclude(m => m!.Znamka)
            .OrderByDescending(s => s.Datum)
            .Select(s => new
            {
                s.Id, s.Datum, s.Tip, s.Opis, s.Cena,
                Registrska = s.Vozilo!.Registrska,
                Znamka = s.Vozilo.Model!.Znamka!.Ime,
                Model = s.Vozilo.Model.Ime,
                s.VozilaId
            })
            .ToListAsync();
        return Ok(result);
    }

    [HttpGet("vozilo/{voziloId}")]
    public async Task<IActionResult> GetByVozilo(int voziloId)
    {
        if (!await _db.Vozila.AnyAsync(v => v.Id == voziloId))
            return NotFound(new { message = "Vozilo ne obstaja!" });

        var result = await _db.Servisi
            .Where(s => s.VozilaId == voziloId)
            .OrderByDescending(s => s.Datum)
            .Select(s => new { s.Id, s.Datum, s.Tip, s.Opis, s.Cena })
            .ToListAsync();
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var s = await _db.Servisi.FindAsync(id);
        if (s == null) return NotFound();
        return Ok(s);
    }

    [HttpPost]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Create([FromBody] ServisCreateDto dto)
    {
        var vozilo = await _db.Vozila.FindAsync(dto.VozilaId);
        if (vozilo == null) return BadRequest(new { message = "Vozilo ne obstaja!" });
        if (dto.Cena < 0) return BadRequest(new { message = "Cena ne sme biti negativna!" });

        vozilo.Status = "v servisu";

        var s = new Servis
        {
            VozilaId = dto.VozilaId,
            Datum = dto.Datum,
            Tip = dto.Tip.Trim(),
            Opis = dto.Opis,
            Cena = dto.Cena
        };
        _db.Servisi.Add(s);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Servis dodan.", id = s.Id });
    }

    [HttpPut("{id}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Update(int id, [FromBody] ServisUpdateDto dto)
    {
        var s = await _db.Servisi.FindAsync(id);
        if (s == null) return NotFound();
        if (dto.Cena < 0) return BadRequest(new { message = "Cena ne sme biti negativna!" });

        s.Datum = dto.Datum;
        s.Tip = dto.Tip.Trim();
        s.Opis = dto.Opis;
        s.Cena = dto.Cena;
        await _db.SaveChangesAsync();
        return Ok(new { message = "Servis posodobljen." });
    }

    [HttpPut("vozilo/{voziloId}/zakljuci")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Zakljuci(int voziloId)
    {
        var vozilo = await _db.Vozila.FindAsync(voziloId);
        if (vozilo == null) return NotFound();
        if (vozilo.Status != "v servisu")
            return BadRequest(new { message = "Vozilo trenutno ni v servisu!" });

        vozilo.Status = "na voljo";
        await _db.SaveChangesAsync();
        return Ok(new { message = "Vozilo vrnjeno v promet." });
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Delete(int id)
    {
        var s = await _db.Servisi.FindAsync(id);
        if (s == null) return NotFound();
        _db.Servisi.Remove(s);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Servis izbrisan." });
    }
}

[ApiController]
[Route("api/statistika")]
[Authorize(Policy = "AdminOnly")]
public class StatistikaController : ControllerBase
{
    private readonly AppDbContext _db;
    public StatistikaController(AppDbContext db) { _db = db; }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var skupajVozil = await _db.Vozila.CountAsync();
        var naVoljo = await _db.Vozila.CountAsync(v => v.Status == "na voljo");
        var vNajemu = await _db.Vozila.CountAsync(v => v.Status == "v najemu");
        var vServisu = await _db.Vozila.CountAsync(v => v.Status == "v servisu");
        var aktivneRez = await _db.Rezervacije.CountAsync(r => r.Status == "aktivna");
        var skupajKm = await _db.Vozila.SumAsync(v => (long)v.Km);

        return Ok(new StatistikaDto(skupajVozil, naVoljo, vNajemu, vServisu, aktivneRez, skupajKm));
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        var kmPoVozilih = await _db.Vozila
            .Include(v => v.Model).ThenInclude(m => m!.Znamka)
            .OrderByDescending(v => v.Km)
            .Take(8)
            .Select(v => new {
                registrska = v.Registrska,
                naziv = v.Model!.Znamka!.Ime + " " + v.Model.Ime,
                km = v.Km
            })
            .ToListAsync();

        var rezervacijePoMesecih = await _db.Rezervacije
            .Where(r => r.Zacetek.Year == DateTime.Now.Year)
            .GroupBy(r => r.Zacetek.Month)
            .Select(g => new {
                mesec = g.Key,
                stevilo = g.Count()
            })
            .OrderBy(x => x.mesec)
            .ToListAsync();

        var statusVozil = new {
            naVoljo = await _db.Vozila.CountAsync(v => v.Status == "na voljo"),
            vNajemu = await _db.Vozila.CountAsync(v => v.Status == "v najemu"),
            vServisu = await _db.Vozila.CountAsync(v => v.Status == "v servisu")
        };

        var topZaposleni = await _db.Rezervacije
            .Include(r => r.Zaposleni)
            .GroupBy(r => new { r.ZaposleniId, r.Zaposleni!.Ime, r.Zaposleni.Priimek })
            .Select(g => new {
                ime = g.Key.Ime + " " + g.Key.Priimek,
                stevilo = g.Count()
            })
            .OrderByDescending(x => x.stevilo)
            .Take(5)
            .ToListAsync();

        var meseci = new[] { "Jan","Feb","Mar","Apr","Maj","Jun","Jul","Avg","Sep","Okt","Nov","Dec" };
        var rezervacijePolne = meseci.Select((m, i) => new {
            mesec = m,
            stevilo = rezervacijePoMesecih.FirstOrDefault(x => x.mesec == i + 1)?.stevilo ?? 0
        }).ToList();

        return Ok(new { kmPoVozilih, rezervacijePoMesecih = rezervacijePolne, statusVozil, topZaposleni });
    }
}
