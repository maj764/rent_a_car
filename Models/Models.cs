using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RentACar.API.Models;

[Table("zaposleni")]
public class Zaposleni
{
    [Key][Column("id")] public int Id { get; set; }
    [Column("ime")] public string Ime { get; set; } = "";
    [Column("priimek")] public string Priimek { get; set; } = "";
    [Column("email")] public string Email { get; set; } = "";
    [Column("geslo")] public string Geslo { get; set; } = "";
    [Column("nivo_zaposlenega_id")] public int NivoZaposlegaId { get; set; }

    [ForeignKey("NivoZaposlegaId")]
    public NivoZaposlenega? Nivo { get; set; }
}

[Table("nivo_zaposlenega")]
public class NivoZaposlenega
{
    [Key][Column("id")] public int Id { get; set; }
    [Column("naziv")] public string? Naziv { get; set; }
    [Column("max_razred")] public int MaxRazred { get; set; }
}

[Table("vozila")]
public class Vozilo
{
    [Key][Column("id")] public int Id { get; set; }
    [Column("reigstrska")] public string Registrska { get; set; } = "";
    [Column("letnik")] public int Letnik { get; set; }
    [Column("km")] public int Km { get; set; }
    [Column("status")] public string Status { get; set; } = "na voljo";
    [Column("modeli_id")] public int ModeliId { get; set; }
    [Column("opis")] public string? Opis { get; set; }
    [Column("razred_vozila_id")] public int RazredVozilaId { get; set; }

    [ForeignKey("ModeliId")] public Model? Model { get; set; }
    [ForeignKey("RazredVozilaId")] public RazredVozila? Razred { get; set; }
}

[Table("modeli")]
public class Model
{
    [Key][Column("id")] public int Id { get; set; }
    [Column("ime")] public string Ime { get; set; } = "";
    [Column("znamke_id")] public int ZnamkeId { get; set; }
    [ForeignKey("ZnamkeId")] public Znamka? Znamka { get; set; }
}

[Table("znamke")]
public class Znamka
{
    [Key][Column("id")] public int Id { get; set; }
    [Column("ime")] public string Ime { get; set; } = "";
}

[Table("razred_vozila")]
public class RazredVozila
{
    [Key][Column("id")] public int Id { get; set; }
    [Column("naziv")] public string Naziv { get; set; } = "";
    [Column("opis")] public string? Opis { get; set; }
    [Column("razred")] public int Razred { get; set; }
}

[Table("rezervacija")]
public class Rezervacija
{
    [Key][Column("id")] public int Id { get; set; }
    [Column("zacetek")] public DateOnly Zacetek { get; set; }
    [Column("konec")] public DateOnly Konec { get; set; }
    [Column("status")] public string Status { get; set; } = "aktivna";
    [Column("opis")] public string? Opis { get; set; }
    [Column("zaposleni_id")] public int ZaposleniId { get; set; }
    [Column("vozila_id")] public int VozilaId { get; set; }

    [ForeignKey("ZaposleniId")] public Zaposleni? Zaposleni { get; set; }
    [ForeignKey("VozilaId")] public Vozilo? Vozilo { get; set; }
}

[Table("prevozeni_km")]
public class PrevozeniKm
{
    [Key][Column("id")] public int Id { get; set; }
    [Column("zacetni_km")] public int? ZacetniKm { get; set; }
    [Column("koncni_km")] public int? KoncniKm { get; set; }
    [Column("skupaj")] public int? Skupaj { get; set; }
    [Column("opombe")] public string? Opombe { get; set; }
    [Column("rezervacija_id")] public int RezervacijaId { get; set; }
}

[Table("servisi")]
public class Servis
{
    [Key][Column("id")] public int Id { get; set; }
    [Column("datum")] public DateOnly Datum { get; set; }
    [Column("tip")] public string Tip { get; set; } = "";
    [Column("opis")] public string? Opis { get; set; }
    [Column("cena")] public float Cena { get; set; }
    [Column("vozila_id")] public int VozilaId { get; set; }
    [ForeignKey("VozilaId")] public Vozilo? Vozilo { get; set; }
}
