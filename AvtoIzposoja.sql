CREATE TABLE zaposleni(
  id serial NOT NULL,
  ime character varying NOT NULL,
  priimek character varying NOT NULL,
  email character varying NOT NULL,
  nivo_zaposlenega_id integer NOT NULL,
  geslo character varying NOT NULL,
  CONSTRAINT zaposleni_pkey PRIMARY KEY(id)
);


CREATE TABLE nivo_zaposlenega(
  id serial NOT NULL,
  naziv character varying,
  max_razred integer NOT NULL,
  CONSTRAINT nivo_zaposlenega_pkey PRIMARY KEY(id)
);


CREATE TABLE vozila(
  id serial NOT NULL,
  reigstrska character varying NOT NULL,
  letnik integer NOT NULL,
  km integer NOT NULL,
  status character varying NOT NULL,
  modeli_id integer NOT NULL,
  opis text,
  razred_vozila_id integer NOT NULL,
  CONSTRAINT vozila_pkey PRIMARY KEY(id)
);


CREATE TABLE modeli(
  id serial NOT NULL,
  ime character varying NOT NULL,
  znamke_id integer NOT NULL,
  CONSTRAINT modeli_pkey PRIMARY KEY(id)
);


CREATE TABLE znamke(
id serial NOT NULL, ime character varying NOT NULL,
  CONSTRAINT vozila_pkey PRIMARY KEY(id)
);


CREATE TABLE razred_vozila(
  id serial NOT NULL,
  naziv character varying NOT NULL,
  opis character varying,
  CONSTRAINT razred_vozila_pkey PRIMARY KEY(id)
);


CREATE TABLE rezervacija(
  id serial NOT NULL,
  zacetek date NOT NULL,
  konec date NOT NULL,
  status character varying NOT NULL,
  opis text,
  zaposleni_id integer NOT NULL,
  vozila_id integer NOT NULL,
  CONSTRAINT rezervacija_pkey PRIMARY KEY(id)
);


CREATE TABLE prevozeni_km(
  id serial NOT NULL,
  zacetni_km integer,
  koncni_km integer,
  skupaj integer,
  opombe text,
  rezervacija_id integer NOT NULL,
  CONSTRAINT prevozeni_km_pkey PRIMARY KEY(id)
);


CREATE TABLE servisi(
  id serial NOT NULL,
  datum date NOT NULL,
  tip character varying NOT NULL,
  opis text,
  cena real NOT NULL,
  vozila_id integer NOT NULL,
  CONSTRAINT servisi_pkey PRIMARY KEY(id)
);


ALTER TABLE zaposleni
  ADD CONSTRAINT zaposleni_nivo_zaposlenega_id_fkey
    FOREIGN KEY (nivo_zaposlenega_id) REFERENCES nivo_zaposlenega (id)
;


ALTER TABLE modeli
  ADD CONSTRAINT modeli_znamke_id_fkey
    FOREIGN KEY (znamke_id) REFERENCES znamke (id)
;


ALTER TABLE vozila
  ADD CONSTRAINT vozila_modeli_id_fkey
    FOREIGN KEY (modeli_id) REFERENCES modeli (id)
;


ALTER TABLE vozila
  ADD CONSTRAINT vozila_razred_vozila_id_fkey
    FOREIGN KEY (razred_vozila_id) REFERENCES razred_vozila (id)
;


ALTER TABLE rezervacija
  ADD CONSTRAINT rezervacija_zaposleni_id_fkey
    FOREIGN KEY (zaposleni_id) REFERENCES zaposleni (id)
;


ALTER TABLE prevozeni_km
  ADD CONSTRAINT prevozeni_km_rezervacija_id_fkey
    FOREIGN KEY (rezervacija_id) REFERENCES rezervacija (id)
;


ALTER TABLE rezervacija
  ADD CONSTRAINT rezervacija_vozila_id_fkey
    FOREIGN KEY (vozila_id) REFERENCES vozila (id)
;


ALTER TABLE servisi
  ADD CONSTRAINT servisi_vozila_id_fkey
    FOREIGN KEY (vozila_id) REFERENCES vozila (id)
;

