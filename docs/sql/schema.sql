CREATE TABLE funds (
  id      text PRIMARY KEY,
  name    text NOT NULL,
  short   text NOT NULL,
  hebrew  text NOT NULL,
  accent  text NOT NULL
);

CREATE TABLE entries (
  id      serial PRIMARY KEY,
  fund_id text    NOT NULL REFERENCES funds(id),
  date    date    NOT NULL,
  price   numeric NOT NULL,
  note    text,
  flow    numeric,
  UNIQUE (fund_id, date)
);

ALTER TABLE funds   ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read funds"   ON funds   FOR SELECT USING (true);
CREATE POLICY "public read entries" ON entries FOR SELECT USING (true);
