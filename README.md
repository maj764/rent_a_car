# 🚗 RentACar

Sistem upravljanja voznega parka podjetja.  
Zagotavlja REST endpoints za upravljanje vozil, zaposlenih, rezervacij in servisov.

---

## Tehnološki sklad

| Tehnologija | Verzija |
|---|---|
| .NET | 8.0 |
| Entity Framework Core | 8.0 |
| Npgsql (PostgreSQL) | 8.0 |
| JWT Bearer Auth | 8.0 |
| BCrypt.Net | 4.0.3 |
| Swashbuckle (Swagger) | 6.5 |

---

## Zagon

### Zahteve
- .NET SDK 8.0
- PostgreSQL strežnik

### Konfiguracija

Uredi `appsettings.json`:

```json
{
  "ConnectionStrings": {
    "Default": "Host=TVOJ_HOST;Port=6767;Database=TVOJA_DB;Username=USER;Password=GESLO"
  },
  "Jwt": {
    "Secret": "tvoj-secret-key-vsaj-32-znakov!!"
  },
  "Urls": "http://0.0.0.0:5067"
}
```

### Zaženi

```bash
dotnet restore
dotnet run
```

API bo dosegljiv na `http://IP:5067`  
Swagger dokumentacija: `http://IP:5067/`