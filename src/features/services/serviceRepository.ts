import { AppError } from '../../lib/errors';
import { requireSupabaseClient } from '../../lib/supabase';

export interface ServiceCategory {
  id: string;
  name: string;
  description: string | null;
  displayOrder: number;
}

export interface SalonService {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number;
}

export interface ServiceCategoryWithServices extends ServiceCategory {
  services: SalonService[];
}

export async function fetchServiceCatalog(): Promise<ServiceCategoryWithServices[]> {
  const client = requireSupabaseClient();
  const [categoriesResult, servicesResult] = await Promise.all([
    client
      .from('service_categories')
      .select('id, name, description, display_order')
      .eq('is_active', true)
      .order('display_order'),
    client
      .from('services')
      .select('id, category_id, name, description, duration_minutes, price')
      .eq('is_active', true)
      .order('name'),
  ]);

  if (categoriesResult.error || servicesResult.error) {
    throw new AppError('No pudimos cargar los servicios. Inténtalo nuevamente.');
  }

  const services = (servicesResult.data ?? []).map((service) => ({
    id: service.id,
    categoryId: service.category_id,
    name: service.name,
    description: service.description,
    durationMinutes: Number(service.duration_minutes),
    price: Number(service.price),
  }));

  return (categoriesResult.data ?? [])
    .map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      displayOrder: Number(category.display_order),
      services: services.filter((service) => service.categoryId === category.id),
    }))
    .filter((category) => category.services.length > 0);
}

