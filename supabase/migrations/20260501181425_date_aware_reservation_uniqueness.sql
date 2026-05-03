alter table public."Reservations"
  drop constraint if exists reservations_user_slot_unique;

alter table public."Reservations"
  add constraint reservations_user_slot_date_unique
  unique (user_id, slot_id, reservation_date);
