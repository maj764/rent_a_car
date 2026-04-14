using Microsoft.EntityFrameworkCore;
using RentACar.API.Models;

namespace RentACar.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Zaposleni> Zaposleni { get; set; }
    public DbSet<NivoZaposlenega> NivojiZaposlenih { get; set; }
    public DbSet<Vozilo> Vozila { get; set; }
    public DbSet<Model> Modeli { get; set; }
    public DbSet<Znamka> Znamke { get; set; }
    public DbSet<RazredVozila> RazrediVozil { get; set; }
    public DbSet<Rezervacija> Rezervacije { get; set; }
    public DbSet<PrevozeniKm> PrevozeniKm { get; set; }
    public DbSet<Servis> Servisi { get; set; }
}
