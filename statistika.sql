
CREATE OR REPLACE FUNCTION get_statistika()
RETURNS TABLE (
    skupaj_vozil         BIGINT,
    na_voljo             BIGINT,
    v_najemu             BIGINT,
    v_servisu            BIGINT,
    aktivne_rezervacije  BIGINT,
    skupaj_km_vseh_vozil BIGINT
) AS
$$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)                                             AS skupaj_vozil,
        COUNT(*) FILTER (WHERE status = 'na voljo')         AS na_voljo,
        COUNT(*) FILTER (WHERE status = 'v najemu')         AS v_najemu,
        COUNT(*) FILTER (WHERE status = 'v servisu')        AS v_servisu,
        (SELECT COUNT(*) FROM rezervacija
         WHERE status = 'aktivna')                          AS aktivne_rezervacije,
        SUM(km)::BIGINT                                     AS skupaj_km_vseh_vozil
    FROM vozila;
END;
$$ LANGUAGE plpgsql;

SELECT * FROM get_statistika();
