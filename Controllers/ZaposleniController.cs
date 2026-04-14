using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RentACar.API.Data;
using RentACar.API.DTOs;
using RentACar.API.Models;

namespace RentACar.API.Controllers;

[ApiController]
[Route("api/zaposleni")]
[Authorize]
public class ZaposleniController : ControllerBase
{
    private readonly AppDbContext _db;
    public ZaposleniController(AppDbContext db) { _db = db; }

    [HttpGet]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> GetAll()
    {
        var result = await _db.Zaposleni
            .Include(z => z.Nivo)
            .OrderBy(z => z.Priimek)
            .Select(z => new ZaposleniResponseDto(
                z.Id, z.Ime, z.Priimek, z.Email,
                z.Nivo!.Naziv ?? "", z.Nivo.MaxRazred))
            .ToListAsync();
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var z = await _db.Zaposleni.Include(x => x.Nivo).FirstOrDefaultAsync(x => x.Id == id);
        if (z == null) return NotFound();
        return Ok(new ZaposleniResponseDto(z.Id, z.Ime, z.Priimek, z.Email, z.Nivo?.Naziv ?? "", z.Nivo?.MaxRazred ?? 0));
    }

    [HttpPost]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Create([FromBody] ZaposleniCreateDto dto)
    {
        var result = await _db.Database
            .SqlQueryRaw<string>(
                @"SELECT registracija_zaposlenega({0},{1},{2},{3},{4}) AS ""Value""",
                dto.Ime, dto.Priimek, dto.Email, dto.Geslo, dto.NivoId)
            .FirstOrDefaultAsync();

        if (result == null || !result.StartsWith("Zaposleni registriran:"))
            return BadRequest(new { message = result });

        return Ok(new { message = result });
    }

    [HttpPut("{id}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Update(int id, [FromBody] ZaposleniUpdateDto dto)
    {
        var z = await _db.Zaposleni.FindAsync(id);
        if (z == null) return NotFound();

        if (!await _db.NivojiZaposlenih.AnyAsync(n => n.Id == dto.NivoId))
            return BadRequest(new { message = "Nivo ne obstaja!" });

        if (await _db.Zaposleni.AnyAsync(x => x.Email.ToLower() == dto.Email.ToLower() && x.Id != id))
            return BadRequest(new { message = "E-pošta je že v uporabi!" });

        z.Ime = dto.Ime.Trim();
        z.Priimek = dto.Priimek.Trim();
        z.Email = dto.Email.Trim();
        z.NivoZaposlegaId = dto.NivoId;

        await _db.SaveChangesAsync();
        return Ok(new { message = "Zaposleni posodobljen." });
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Delete(int id)
    {
        var z = await _db.Zaposleni.FindAsync(id);
        if (z == null) return NotFound();

        var imaRezervacije = await _db.Rezervacije.AnyAsync(r => r.ZaposleniId == id);
        if (imaRezervacije)
            return BadRequest(new { message = "Zaposleni ima vezane rezervacije, ga ni mogoče izbrisati!" });

        _db.Zaposleni.Remove(z);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Zaposleni izbrisan." });
    }

    // Nivoji
    [HttpGet("nivoji")]
    public async Task<IActionResult> GetNivoji()
    {
        var result = await _db.NivojiZaposlenih
            .OrderBy(n => n.MaxRazred)
            .Select(n => new NivoDto(n.Id, n.Naziv, n.MaxRazred))
            .ToListAsync();
        return Ok(result);
    }

    [HttpPost("nivoji")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> CreateNivo([FromBody] NivoDto dto)
    {
        var nivo = new NivoZaposlenega { Naziv = dto.Naziv, MaxRazred = dto.MaxRazred };
        _db.NivojiZaposlenih.Add(nivo);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Nivo dodan.", id = nivo.Id });
    }

    [HttpPut("nivoji/{id}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> UpdateNivo(int id, [FromBody] NivoDto dto)
    {
        var n = await _db.NivojiZaposlenih.FindAsync(id);
        if (n == null) return NotFound();
        n.Naziv = dto.Naziv;
        n.MaxRazred = dto.MaxRazred;
        await _db.SaveChangesAsync();
        return Ok(new { message = "Nivo posodobljen." });
    }

    [HttpDelete("nivoji/{id}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> DeleteNivo(int id)
    {
        var n = await _db.NivojiZaposlenih.FindAsync(id);
        if (n == null) return NotFound();
        if (await _db.Zaposleni.AnyAsync(z => z.NivoZaposlegaId == id))
            return BadRequest(new { message = "Nivo je v uporabi!" });
        _db.NivojiZaposlenih.Remove(n);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Nivo izbrisan." });
    }
}
