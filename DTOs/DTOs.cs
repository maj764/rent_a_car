namespace RentACar.API.DTOs;

// Auth
public record LoginDto(string Email, string Geslo);
public record LoginResponseDto(string Token, string Ime, string Priimek, string Email, string Vloga, int Id);

// Zaposleni
public record ZaposleniCreateDto(string Ime, string Priimek, string Email, string Geslo, int NivoId);
public record ZaposleniUpdateDto(string Ime, string Priimek, string Email, int NivoId);
public record ZaposleniResponseDto(int Id, string Ime, string Priimek, string Email, string Nivo, int MaxRazred);

// Nivo
public record NivoDto(int Id, string? Naziv, int MaxRazred);

// Vozilo
public record VoziloCreateDto(string Registrska, int Letnik, int Km, int ModeliId, int RazredId, string? Opis);
public record VoziloUpdateDto(string Registrska, int Letnik, int Km, int ModeliId, int RazredId, string? Opis, string Status);
public record VoziloResponseDto(int Id, string Registrska, int Letnik, int Km, string Status, string Znamka, string Model, string Razred, string? Opis);

// Znamka
public record ZnamkaDto(int Id, string Ime);
public record ZnamkaCreateDto(string Ime);

// Model
public record ModelDto(int Id, string Ime, int ZnamkeId);
public record ModelCreateDto(string Ime, int ZnamkeId);

// Razred
public record RazredDto(int Id, string Naziv, string? Opis);
public record RazredCreateDto(string Naziv, string? Opis);

// Rezervacija
public record RezervacijaCreateDto(int ZaposleniId, int VozilaId, DateOnly Zacetek, DateOnly Konec, string? Opis);
public record RezervacijaUpdateDto(DateOnly Zacetek, DateOnly Konec, string? Opis);
public record ZakljuciDto(int ZacetniKm, int KoncniKm, string? Opombe);
public record RezervacijaResponseDto(
    int Id, DateOnly Zacetek, DateOnly Konec, string Status, string? Opis,
    string ZaposleniIme, string Registrska, string Znamka, string Model);

// Servis
public record ServisCreateDto(int VozilaId, DateOnly Datum, string Tip, string? Opis, float Cena);
public record ServisUpdateDto(DateOnly Datum, string Tip, string? Opis, float Cena);

// Statistika
public record StatistikaDto(
    long SkupajVozil, long NaVoljo, long VNajemu, long VServisu,
    long AktivneRezervacije, long SkupajKmVsehVozil);
