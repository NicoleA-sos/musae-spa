export type UserRole = 'admin' | 'customer';

export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'no_show';

export type PaymentStatus = 'pending' | 'approved' | 'failed' | 'refunded';
