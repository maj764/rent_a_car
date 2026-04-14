using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using RentACar.API.Data;
using RentACar.API.DTOs;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace RentACar.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public AuthController(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var conn = _db.Database.GetDbConnection();
        await conn.OpenAsync();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT prijava_zaposlenega(@p0, @p1)";
        var p0 = cmd.CreateParameter(); p0.ParameterName = "p0"; p0.Value = dto.Email; cmd.Parameters.Add(p0);
        var p1 = cmd.CreateParameter(); p1.ParameterName = "p1"; p1.Value = dto.Geslo; cmd.Parameters.Add(p1);
        var result = (await cmd.ExecuteScalarAsync())?.ToString();

        if (result == null || !result.StartsWith("Prijava uspešna:"))
            return Unauthorized(new { message = "Napačen e-mail ali geslo!" });

        var zaposleni = await _db.Zaposleni
            .Include(z => z.Nivo)
            .FirstOrDefaultAsync(z => z.Email.ToLower() == dto.Email.ToLower());

        if (zaposleni == null)
            return Unauthorized();

        var vloga = zaposleni.NivoZaposlegaId == 1 ? "admin" : "zaposleni";

        var token = GenerateToken(zaposleni.Id, zaposleni.Email, vloga);

        return Ok(new LoginResponseDto(
            token,
            zaposleni.Ime,
            zaposleni.Priimek,
            zaposleni.Email,
            vloga,
            zaposleni.Id
        ));
    }

    private string GenerateToken(int id, string email, string vloga)
    {
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_config["Jwt:Secret"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, id.ToString()),
            new Claim(ClaimTypes.Email, email),
            new Claim(ClaimTypes.Role, vloga)
        };

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}