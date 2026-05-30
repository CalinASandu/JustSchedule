create index if not exists reservation_history_user_idx
  on public."ReservationHistory" ((new_row->>'user_id'), school_id);
