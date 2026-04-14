CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION prijava_zaposlenega(p_email TEXT, p_geslo TEXT)
RETURNS TEXT AS
$$
DECLARE
    v_ime     TEXT;
    v_priimek TEXT;
    v_nivo    TEXT;
BEGIN
    IF EXISTS (
        SELECT 1
        FROM zaposleni z
        WHERE LOWER(z.email) = LOWER(p_email)
          AND z.geslo = crypt(p_geslo, z.geslo)
    ) THEN
        SELECT z.ime, z.priimek, n.naziv
        INTO v_ime, v_priimek, v_nivo
        FROM zaposleni z
        INNER JOIN nivo_zaposlenega n ON n.id = z.nivo_zaposlenega_id
        WHERE LOWER(z.email) = LOWER(p_email)
        LIMIT 1;

        RETURN 'Prijava uspešna:' || v_ime || ' ' || v_priimek || ' (' || v_nivo || ')';
    ELSE
        RETURN 'Napačen e-mail ali geslo!';
    END IF;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION registracija_zaposlenega(
    p_ime     TEXT,
    p_priimek TEXT,
    p_email   TEXT,
    p_geslo   TEXT,
    p_nivo_id INT
)
RETURNS TEXT AS
$$
DECLARE
    nov_id INT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM nivo_zaposlenega WHERE id = p_nivo_id) THEN
        RETURN 'Izbran nivo zaposlenega ne obstaja!';
    END IF;

    IF EXISTS (
        SELECT 1 FROM zaposleni
        WHERE LOWER(email) = LOWER(p_email)
    ) THEN
        RETURN 'E-pošta je že v uporabi!';
    END IF;

    INSERT INTO zaposleni (ime, priimek, email, geslo, nivo_zaposlenega_id)
    VALUES (
        TRIM(p_ime),
        TRIM(p_priimek),
        TRIM(p_email),
        crypt(p_geslo, gen_salt('bf', 12)),
        p_nivo_id
    )
    RETURNING id INTO nov_id;

    RETURN 'Zaposleni registriran:' || nov_id;
END;
$$ LANGUAGE plpgsql;



CREATE OR REPLACE FUNCTION get_zaposleni()
RETURNS TABLE (
    id         INT,
    ime        VARCHAR,
    priimek    VARCHAR,
    email      VARCHAR,
    nivo       VARCHAR,
    max_razred INT
) AS
$$
BEGIN
    RETURN QUERY
    SELECT
        z.id,
        z.ime,
        z.priimek,
        z.email,
        n.naziv     AS nivo,
        n.max_razred
    FROM zaposleni z
    INNER JOIN nivo_zaposlenega n ON n.id = z.nivo_zaposlenega_id
    ORDER BY z.priimek, z.ime;
END;
$$ LANGUAGE plpgsql;



CREATE OR REPLACE FUNCTION get_nivoji()
RETURNS TABLE (
    id         INT,
    naziv      VARCHAR,
    max_razred INT
) AS
$$
BEGIN
    RETURN QUERY
    SELECT n.id, n.naziv, n.max_razred
    FROM nivo_zaposlenega n
    ORDER BY n.max_razred;
END;
$$ LANGUAGE plpgsql;
