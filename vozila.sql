CREATE OR REPLACE FUNCTION dodaj_vozilo(
    p_registrska VARCHAR,
    p_letnik     INT,
    p_km         INT,
    p_modeli_id  INT,
    p_razred_id  INT,
    p_opis       TEXT DEFAULT NULL
)
RETURNS TEXT AS
$$
DECLARE
    nov_id INT;
BEGIN
    IF EXISTS (
        SELECT 1 FROM vozila
        WHERE LOWER(reigtrska) = LOWER(p_registrska)
    ) THEN
        RETURN 'Vozilo s to registrsko oznako že obstaja!';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM modeli WHERE id = p_modeli_id) THEN
        RETURN 'Izbran model ne obstaja!';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM razred_vozila WHERE id = p_razred_id) THEN
        RETURN 'Izbran razred vozila ne obstaja!';
    END IF;

    IF p_letnik < 1990 OR p_letnik > EXTRACT(YEAR FROM CURRENT_DATE) THEN
        RETURN 'Neveljaven letnik vozila!';
    END IF;

    IF p_km < 0 THEN
        RETURN 'Kilometrina ne sme biti negativna!';
    END IF;

    INSERT INTO vozila (reigtrska, letnik, km, status, modeli_id, razred_vozila_id, opis)
    VALUES (TRIM(p_registrska), p_letnik, p_km, 'na voljo', p_modeli_id, p_razred_id, p_opis)
    RETURNING id INTO nov_id;

    RETURN 'Vozilo dodano:' || nov_id;
END;
$$ LANGUAGE plpgsql;

SELECT dodaj_vozilo('LJ-AB-123', 2021, 32000, 1, 2, 'Diesel, navigacija');


CREATE OR REPLACE FUNCTION get_vozila()
RETURNS TABLE (
    id         INT,
    registrska VARCHAR,
    letnik     INT,
    km         INT,
    status     VARCHAR,
    znamka     VARCHAR,
    model      VARCHAR,
    razred     VARCHAR,
    opis       TEXT
) AS
$$
BEGIN
    RETURN QUERY
    SELECT
        v.id,
        v.reigtrska,
        v.letnik,
        v.km,
        v.status,
        z.ime       AS znamka,
        m.ime       AS model,
        r.naziv     AS razred,
        v.opis
    FROM vozila v
    INNER JOIN modeli m        ON m.id = v.modeli_id
    INNER JOIN znamke z        ON z.id = m.znamke_id
    INNER JOIN razred_vozila r ON r.id = v.razred_vozila_id
    ORDER BY z.ime, m.ime;
END;
$$ LANGUAGE plpgsql;

SELECT * FROM get_vozila();



CREATE OR REPLACE FUNCTION get_vozila_na_voljo(
    p_zaposleni_id INT,
    p_zacetek      DATE,
    p_konec        DATE
)
RETURNS TABLE (
    id         INT,
    registrska VARCHAR,
    znamka     VARCHAR,
    model      VARCHAR,
    razred     VARCHAR,
    letnik     INT,
    km         INT
) AS
$$
DECLARE
    v_max_razred INT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM zaposleni WHERE id = p_zaposleni_id) THEN
        RETURN;
    END IF;

    SELECT n.max_razred
    INTO v_max_razred
    FROM zaposleni z
    INNER JOIN nivo_zaposlenega n ON n.id = z.nivo_zaposlenega_id
    WHERE z.id = p_zaposleni_id;

    RETURN QUERY
    SELECT
        v.id,
        v.reigtrska,
        zn.ime      AS znamka,
        m.ime       AS model,
        r.naziv     AS razred,
        v.letnik,
        v.km
    FROM vozila v
    INNER JOIN modeli m        ON m.id = v.modeli_id
    INNER JOIN znamke zn       ON zn.id = m.znamke_id
    INNER JOIN razred_vozila r ON r.id = v.razred_vozila_id
    WHERE v.status = 'na voljo'
      AND v.razred_vozila_id <= v_max_razred
      AND NOT EXISTS (
          SELECT 1
          FROM rezervacija r2
          WHERE r2.vozila_id = v.id
            AND r2.status NOT IN ('preklicana', 'zaključena')
            AND r2.zacetek < p_konec
            AND r2.konec > p_zacetek
      )
    ORDER BY zn.ime, m.ime;
END;
$$ LANGUAGE plpgsql;

SELECT * FROM get_vozila_na_voljo(1, '2026-04-10', '2026-04-15');



CREATE OR REPLACE FUNCTION get_znamke()
RETURNS TABLE (
    id  INT,
    ime VARCHAR
) AS
$$
BEGIN
    RETURN QUERY
    SELECT z.id, z.ime
    FROM znamke z
    ORDER BY z.ime;
END;
$$ LANGUAGE plpgsql;

SELECT * FROM get_znamke();


CREATE OR REPLACE FUNCTION get_modeli_po_znamki(p_znamka_id INT)
RETURNS TABLE (
    id  INT,
    ime VARCHAR
) AS
$$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM znamke WHERE id = p_znamka_id) THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT m.id, m.ime
    FROM modeli m
    INNER JOIN znamke z ON z.id = m.znamke_id
    WHERE m.znamke_id = p_znamka_id
    ORDER BY m.ime;
END;
$$ LANGUAGE plpgsql;

SELECT * FROM get_modeli_po_znamki(1);



CREATE OR REPLACE FUNCTION get_razredi_vozil()
RETURNS TABLE (
    id     INT,
    naziv  VARCHAR,
    opis   VARCHAR
) AS
$$
BEGIN
    RETURN QUERY
    SELECT r.id, r.naziv, r.opis
    FROM razred_vozila r
    ORDER BY r.id;
END;
$$ LANGUAGE plpgsql;

SELECT * FROM get_razredi_vozil();
