using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RentACar.API.Data;
using RentACar.API.DTOs;
using RentACar.API.Models;

namespace RentACar.API.Controllers;

[ApiController]
[Route("api/vozila")]
[Authorize]
public class VozilaController : ControllerBase
{
    private readonly AppDbContext _db;
    public VozilaController(AppDbContext db) { _db = db; }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _db.Vozila
            .Include(v => v.Model).ThenInclude(m => m!.Znamka)
            .Include(v => v.Razred)
            .OrderBy(v => v.Model!.Znamka!.Ime)
            .Select(v => new VoziloResponseDto(
                v.Id, v.Registrska, v.Letnik, v.Km, v.Status,
                v.Model!.Znamka!.Ime, v.Model.Ime,
                v.Razred!.Naziv, v.Opis))
            .ToListAsync();
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var v = await _db.Vozila
            .Include(x => x.Model).ThenInclude(m => m!.Znamka)
            .Include(x => x.Razred)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (v == null) return NotFound();
        return Ok(new VoziloResponseDto(
            v.Id, v.Registrska, v.Letnik, v.Km, v.Status,
            v.Model!.Znamka!.Ime, v.Model.Ime, v.Razred!.Naziv, v.Opis));
    }

    [HttpGet("na-voljo")]
    public async Task<IActionResult> GetNaVoljo([FromQuery] int zaposleniId, [FromQuery] DateOnly zacetek, [FromQuery] DateOnly konec)
    {
        var zaposleni = await _db.Zaposleni.Include(z => z.Nivo).FirstOrDefaultAsync(z => z.Id == zaposleniId);
        if (zaposleni == null) return NotFound();

        var maxRazred = zaposleni.Nivo!.MaxRazred;

        var result = await _db.Vozila
            .Include(v => v.Model).ThenInclude(m => m!.Znamka)
            .Include(v => v.Razred)
            .Where(v =>
                v.Status == "na voljo" &&
                v.RazredVozilaId <= maxRazred &&
                !_db.Rezervacije.Any(r =>
                    r.VozilaId == v.Id &&
                    r.Status != "preklicana" && r.Status != "zaključena" &&
                    r.Zacetek < konec && r.Konec > zacetek))
            .Select(v => new VoziloResponseDto(
                v.Id, v.Registrska, v.Letnik, v.Km, v.Status,
                v.Model!.Znamka!.Ime, v.Model.Ime, v.Razred!.Naziv, v.Opis))
            .ToListAsync();

        return Ok(result);
    }

    [HttpPost]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Create([FromBody] VoziloCreateDto dto)
    {
        if (await _db.Vozila.AnyAsync(v => v.Registrska.ToLower() == dto.Registrska.ToLower()))
            return BadRequest(new { message = "Registrska oznaka že obstaja!" });

        if (!await _db.Modeli.AnyAsync(m => m.Id == dto.ModeliId))
            return BadRequest(new { message = "Model ne obstaja!" });

        if (!await _db.RazrediVozil.AnyAsync(r => r.Id == dto.RazredId))
            return BadRequest(new { message = "Razred ne obstaja!" });

        var vozilo = new Vozilo
        {
            Registrska = dto.Registrska.Trim(),
            Letnik = dto.Letnik,
            Km = dto.Km,
            Status = "na voljo",
            ModeliId = dto.ModeliId,
            RazredVozilaId = dto.RazredId,
            Opis = dto.Opis
        };
        _db.Vozila.Add(vozilo);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Vozilo dodano.", id = vozilo.Id });
    }

    [HttpPut("{id}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Update(int id, [FromBody] VoziloUpdateDto dto)
    {
        var v = await _db.Vozila.FindAsync(id);
        if (v == null) return NotFound();

        v.Registrska = dto.Registrska.Trim();
        v.Letnik = dto.Letnik;
        v.Km = dto.Km;
        v.ModeliId = dto.ModeliId;
        v.RazredVozilaId = dto.RazredId;
        v.Opis = dto.Opis;
        v.Status = dto.Status;

        await _db.SaveChangesAsync();
        return Ok(new { message = "Vozilo posodobljeno." });
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Delete(int id)
    {
        var v = await _db.Vozila.FindAsync(id);
        if (v == null) return NotFound();

        if (await _db.Rezervacije.AnyAsync(r => r.VozilaId == id && r.Status == "aktivna"))
            return BadRequest(new { message = "Vozilo ima aktivno rezervacijo!" });

        _db.Vozila.Remove(v);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Vozilo izbrisano." });
    }

    // Znamke
    [HttpGet("znamke")]
    public async Task<IActionResult> GetZnamke()
    {
        var z = await _db.Znamke.OrderBy(x => x.Ime)
            .Select(x => new ZnamkaDto(x.Id, x.Ime)).ToListAsync();
        return Ok(z);
    }

    [HttpPost("znamke")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> CreateZnamka([FromBody] ZnamkaCreateDto dto)
    {
        var z = new Znamka { Ime = dto.Ime.Trim() };
        _db.Znamke.Add(z);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Znamka dodana.", id = z.Id });
    }

    [HttpPut("znamke/{id}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> UpdateZnamka(int id, [FromBody] ZnamkaCreateDto dto)
    {
        var z = await _db.Znamke.FindAsync(id);
        if (z == null) return NotFound();
        z.Ime = dto.Ime.Trim();
        await _db.SaveChangesAsync();
        return Ok(new { message = "Znamka posodobljena." });
    }

    [HttpDelete("znamke/{id}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> DeleteZnamka(int id)
    {
        var z = await _db.Znamke.FindAsync(id);
        if (z == null) return NotFound();
        if (await _db.Modeli.AnyAsync(m => m.ZnamkeId == id))
            return BadRequest(new { message = "Znamka ima vezane modele!" });
        _db.Znamke.Remove(z);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Znamka izbrisana." });
    }

    // Modeli
    [HttpGet("modeli")]
    public async Task<IActionResult> GetModeli([FromQuery] int? znamkaId)
    {
        var q = _db.Modeli.AsQueryable();
        if (znamkaId.HasValue) q = q.Where(m => m.ZnamkeId == znamkaId);
        var result = await q.OrderBy(m => m.Ime)
            .Select(m => new ModelDto(m.Id, m.Ime, m.ZnamkeId)).ToListAsync();
        return Ok(result);
    }

    [HttpPost("modeli")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> CreateModel([FromBody] ModelCreateDto dto)
    {
        if (!await _db.Znamke.AnyAsync(z => z.Id == dto.ZnamkeId))
            return BadRequest(new { message = "Znamka ne obstaja!" });
        var m = new Model { Ime = dto.Ime.Trim(), ZnamkeId = dto.ZnamkeId };
        _db.Modeli.Add(m);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Model dodan.", id = m.Id });
    }

    [HttpPut("modeli/{id}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> UpdateModel(int id, [FromBody] ModelCreateDto dto)
    {
        var m = await _db.Modeli.FindAsync(id);
        if (m == null) return NotFound();
        m.Ime = dto.Ime.Trim();
        m.ZnamkeId = dto.ZnamkeId;
        await _db.SaveChangesAsync();
        return Ok(new { message = "Model posodobljen." });
    }

    [HttpDelete("modeli/{id}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> DeleteModel(int id)
    {
        var m = await _db.Modeli.FindAsync(id);
        if (m == null) return NotFound();
        if (await _db.Vozila.AnyAsync(v => v.ModeliId == id))
            return BadRequest(new { message = "Model ima vezana vozila!" });
        _db.Modeli.Remove(m);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Model izbrisan." });
    }

    // Razredi
    [HttpGet("razredi")]
    public async Task<IActionResult> GetRazredi()
    {
        var r = await _db.RazrediVozil.OrderBy(x => x.Id)
            .Select(x => new RazredDto(x.Id, x.Naziv, x.Opis)).ToListAsync();
        return Ok(r);
    }

    [HttpPost("razredi")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> CreateRazred([FromBody] RazredCreateDto dto)
    {
        var r = new RazredVozila { Naziv = dto.Naziv.Trim(), Opis = dto.Opis };
        _db.RazrediVozil.Add(r);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Razred dodan.", id = r.Id });
    }

    [HttpPut("razredi/{id}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> UpdateRazred(int id, [FromBody] RazredCreateDto dto)
    {
        var r = await _db.RazrediVozil.FindAsync(id);
        if (r == null) return NotFound();
        r.Naziv = dto.Naziv.Trim();
        r.Opis = dto.Opis;
        await _db.SaveChangesAsync();
        return Ok(new { message = "Razred posodobljen." });
    }

    [HttpDelete("razredi/{id}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> DeleteRazred(int id)
    {
        var r = await _db.RazrediVozil.FindAsync(id);
        if (r == null) return NotFound();
        if (await _db.Vozila.AnyAsync(v => v.RazredVozilaId == id))
            return BadRequest(new { message = "Razred ima vezana vozila!" });
        _db.RazrediVozil.Remove(r);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Razred izbrisan." });
    }
}
