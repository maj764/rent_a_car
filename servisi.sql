CREATE OR REPLACE FUNCTION dodaj_servis(
    p_vozilo_id INT,
    p_datum     DATE,
    p_tip       TEXT,
    p_opis      TEXT,
    p_cena      REAL
)
RETURNS TEXT AS
$$
DECLARE
    nov_id INT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM vozila WHERE id = p_vozilo_id) THEN
        RETURN 'Vozilo ne obstaja!';
    END IF;

    IF p_cena < 0 THEN
        RETURN 'Cena servisa ne sme biti negativna!';
    END IF;

    UPDATE vozila
    SET status = 'v servisu'
    WHERE id = p_vozilo_id;

    INSERT INTO servisi (datum, tip, opis, cena, vozila_id)
    VALUES (p_datum, TRIM(p_tip), p_opis, p_cena, p_vozilo_id)
    RETURNING id INTO nov_id;

    RETURN 'Servis dodan:' || nov_id;
END;$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION zakljuci_servis(p_vozilo_id INT)
RETURNS TEXT AS
$$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM vozila WHERE id = p_vozilo_id) THEN
        RETURN 'Vozilo ne obstaja!';
    END IF;

    IF (SELECT status FROM vozila WHERE id = p_vozilo_id) != 'v servisu' THEN
        RETURN 'Vozilo trenutno ni v servisu!';
    END IF;

    UPDATE vozila
    SET status = 'na voljo'
    WHERE id = p_vozilo_id;

    RETURN 'Vozilo vrnjeno v promet:' || p_vozilo_id;
END;
$$ LANGUAGE plpgsql;



CREATE OR REPLACE FUNCTION get_servisi_vozila(p_vozilo_id INT)
RETURNS TABLE (
    id    INT,
    datum DATE,
    tip   VARCHAR,
    opis  TEXT,
    cena  REAL
) AS
$$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM vozila WHERE id = p_vozilo_id) THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT s.id, s.datum, s.tip, s.opis, s.cena
    FROM servisi s
    WHERE s.vozila_id = p_vozilo_id
    ORDER BY s.datum DESC;
END;
$$ LANGUAGE plpgsql;
