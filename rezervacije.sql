CREATE OR REPLACE FUNCTION ustvari_rezervacijo(
    p_zaposleni_id INT,
    p_vozilo_id    INT,
    p_zacetek      DATE,
    p_konec        DATE,
    p_opis         TEXT DEFAULT NULL
)
RETURNS TEXT AS
$$
DECLARE
    nov_id          INT;
    v_max_razred    INT;
    v_razred_vozila INT;
    v_status_vozila VARCHAR;
BEGIN
    IF p_zacetek >= p_konec THEN
        RETURN 'Datum začetka mora biti pred datumom konca!';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM zaposleni WHERE id = p_zaposleni_id) THEN
        RETURN 'Zaposleni ne obstaja!';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM vozila WHERE id = p_vozilo_id) THEN
        RETURN 'Vozilo ne obstaja!';
    END IF;

    SELECT status, razred_vozila_id
    INTO v_status_vozila, v_razred_vozila
    FROM vozila
    WHERE id = p_vozilo_id;

    IF v_status_vozila != 'na voljo' THEN
        RETURN 'Vozilo ni na voljo (status: ' || v_status_vozila || ')!';
    END IF;

    SELECT n.max_razred
    INTO v_max_razred
    FROM zaposleni z
    INNER JOIN nivo_zaposlenega n ON n.id = z.nivo_zaposlenega_id
    WHERE z.id = p_zaposleni_id;

    IF v_razred_vozila > v_max_razred THEN
        RETURN 'Vaš nivo ne dovoljuje rezervacije tega razreda vozila!';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM rezervacija r
        WHERE r.vozila_id = p_vozilo_id
          AND r.status NOT IN ('preklicana', 'zaključena')
          AND r.zacetek < p_konec
          AND r.konec > p_zacetek
    ) THEN
        RETURN 'Vozilo je v tem obdobju že rezervirano!';
    END IF;

    INSERT INTO rezervacija (zacetek, konec, status, opis, zaposleni_id, vozila_id)
    VALUES (p_zacetek, p_konec, 'aktivna', p_opis, p_zaposleni_id, p_vozilo_id)
    RETURNING id INTO nov_id;

    UPDATE vozila SET status = 'v najemu' WHERE id = p_vozilo_id;

    RETURN 'Rezervacija ustvarjena:' || nov_id;
END;
$$ LANGUAGE plpgsql;

SELECT ustvari_rezervacijo(1, 3, '2026-04-10', '2026-04-15', 'Službena pot Ljubljana');


CREATE OR REPLACE FUNCTION preklic_rezervacije(
    p_rezervacija_id INT,
    p_zaposleni_id   INT
)
RETURNS TEXT AS
$$
DECLARE
    v_status  VARCHAR;
    v_lastnik INT;
    v_vozilo  INT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM rezervacija WHERE id = p_rezervacija_id) THEN
        RETURN 'Rezervacija ne obstaja!';
    END IF;

    SELECT status, zaposleni_id, vozila_id
    INTO v_status, v_lastnik, v_vozilo
    FROM rezervacija
    WHERE id = p_rezervacija_id;

    IF v_lastnik != p_zaposleni_id THEN
        RETURN 'Nimate pravice preklicati te rezervacije!';
    END IF;

    IF v_status IN ('preklicana', 'zaključena') THEN
        RETURN 'Rezervacija je že ' || v_status || '!';
    END IF;

    UPDATE rezervacija
    SET status = 'preklicana'
    WHERE id = p_rezervacija_id;

    UPDATE vozila
    SET status = 'na voljo'
    WHERE id = v_vozilo;

    RETURN 'Rezervacija preklicana:' || p_rezervacija_id;
END;
$$ LANGUAGE plpgsql;

SELECT preklic_rezervacije(1, 1);


CREATE OR REPLACE FUNCTION zakljuci_rezervacijo(
    p_rezervacija_id INT,
    p_zacetni_km     INT,
    p_koncni_km      INT,
    p_opombe         TEXT DEFAULT NULL
)
RETURNS TEXT AS
$$
DECLARE
    v_status    VARCHAR;
    v_vozilo_id INT;
    v_skupaj    INT;
    nov_id      INT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM rezervacija WHERE id = p_rezervacija_id) THEN
        RETURN 'Rezervacija ne obstaja!';
    END IF;

    SELECT status, vozila_id
    INTO v_status, v_vozilo_id
    FROM rezervacija
    WHERE id = p_rezervacija_id;

    IF v_status != 'aktivna' THEN
        RETURN 'Rezervacija ni aktivna (status: ' || v_status || ')!';
    END IF;

    IF p_koncni_km <= p_zacetni_km THEN
        RETURN 'Končni km morajo biti večji od začetnih!';
    END IF;

    v_skupaj := p_koncni_km - p_zacetni_km;

    INSERT INTO prevozeni_km (zacetni_km, koncni_km, skupaj, opombe, rezervacija_id)
    VALUES (p_zacetni_km, p_koncni_km, v_skupaj, p_opombe, p_rezervacija_id)
    RETURNING id INTO nov_id;

    UPDATE vozila
    SET km = km + v_skupaj,
        status = 'na voljo'
    WHERE id = v_vozilo_id;

    UPDATE rezervacija
    SET status = 'zaključena'
    WHERE id = p_rezervacija_id;

    RETURN 'Rezervacija zaključena. Prevoženi km: ' || v_skupaj || ' (zapis: ' || nov_id || ')';
END;
$$ LANGUAGE plpgsql;

SELECT zakljuci_rezervacijo(1, 45000, 45380, 'Brez opomb');



CREATE OR REPLACE FUNCTION get_rezervacije_zaposlenega(p_zaposleni_id INT)
RETURNS TABLE (
    id         INT,
    zacetek    DATE,
    konec      DATE,
    status     VARCHAR,
    opis       TEXT,
    registrska VARCHAR,
    znamka     VARCHAR,
    model      VARCHAR
) AS
$$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM zaposleni WHERE id = p_zaposleni_id) THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        rez.id,
        rez.zacetek,
        rez.konec,
        rez.status,
        rez.opis,
        v.reigtrska,
        zn.ime      AS znamka,
        mo.ime      AS model
    FROM rezervacija rez
    INNER JOIN vozila v  ON v.id = rez.vozila_id
    INNER JOIN modeli mo ON mo.id = v.modeli_id
    INNER JOIN znamke zn ON zn.id = mo.znamke_id
    WHERE rez.zaposleni_id = p_zaposleni_id
    ORDER BY rez.zacetek DESC;
END;
$$ LANGUAGE plpgsql;

SELECT * FROM get_rezervacije_zaposlenega(1);



CREATE OR REPLACE FUNCTION get_vse_rezervacije()
RETURNS TABLE (
    id            INT,
    zacetek       DATE,
    konec         DATE,
    status        VARCHAR,
    opis          TEXT,
    zaposleni_ime TEXT,
    registrska    VARCHAR,
    znamka        VARCHAR,
    model         VARCHAR
) AS
$$
BEGIN
    RETURN QUERY
    SELECT
        rez.id,
        rez.zacetek,
        rez.konec,
        rez.status,
        rez.opis,
        (z.ime || ' ' || z.priimek)::TEXT AS zaposleni_ime,
        v.reigtrska,
        zn.ime      AS znamka,
        mo.ime      AS model
    FROM rezervacija rez
    INNER JOIN zaposleni z ON z.id = rez.zaposleni_id
    INNER JOIN vozila v    ON v.id = rez.vozila_id
    INNER JOIN modeli mo   ON mo.id = v.modeli_id
    INNER JOIN znamke zn   ON zn.id = mo.znamke_id
    ORDER BY rez.zacetek DESC;
END;
$$ LANGUAGE plpgsql;

SELECT * FROM get_vse_rezervacije();


CREATE OR REPLACE FUNCTION get_rezervacija(p_id INT)
RETURNS TABLE (
    id              INT,
    zacetek         DATE,
    konec           DATE,
    status          VARCHAR,
    opis            TEXT,
    zaposleni_ime   TEXT,
    zaposleni_email VARCHAR,
    registrska      VARCHAR,
    znamka          VARCHAR,
    model           VARCHAR,
    razred          VARCHAR,
    prevozeni_km    INT
) AS
$$
BEGIN
    RETURN QUERY
    SELECT
        rez.id,
        rez.zacetek,
        rez.konec,
        rez.status,
        rez.opis,
        (z.ime || ' ' || z.priimek)::TEXT AS zaposleni_ime,
        z.email,
        v.reigtrska,
        zn.ime      AS znamka,
        mo.ime      AS model,
        r.naziv     AS razred,
        pk.skupaj   AS prevozeni_km
    FROM rezervacija rez
    INNER JOIN zaposleni z     ON z.id = rez.zaposleni_id
    INNER JOIN vozila v        ON v.id = rez.vozila_id
    INNER JOIN modeli mo       ON mo.id = v.modeli_id
    INNER JOIN znamke zn       ON zn.id = mo.znamke_id
    INNER JOIN razred_vozila r ON r.id = v.razred_vozila_id
    LEFT  JOIN prevozeni_km pk ON pk.rezervacija_id = rez.id
    WHERE rez.id = p_id;
END;
$$ LANGUAGE plpgsql;

SELECT * FROM get_rezervacija(1);
