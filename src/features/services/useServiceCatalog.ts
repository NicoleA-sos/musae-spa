import { useEffect, useMemo, useState } from 'react';

import {
  fetchServiceCatalog,
  type SalonService,
  type ServiceCategoryWithServices,
} from './serviceRepository';

interface ServiceCatalogState {
  categories: ServiceCategoryWithServices[];
  isLoading: boolean;
  errorMessage: string;
}

const initialState: ServiceCatalogState = {
  categories: [],
  isLoading: true,
  errorMessage: '',
};

export function useServiceCatalog() {
  const [state, setState] = useState<ServiceCatalogState>(initialState);

  useEffect(() => {
    let isActive = true;

    void fetchServiceCatalog()
      .then((categories) => {
        if (isActive) {
          setState({ categories, isLoading: false, errorMessage: '' });
        }
      })
      .catch(() => {
        if (isActive) {
          setState({
            categories: [],
            isLoading: false,
            errorMessage: 'No pudimos cargar los servicios. Actualiza la página e inténtalo nuevamente.',
          });
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const services = useMemo<SalonService[]>(
    () => state.categories.flatMap((category) => category.services),
    [state.categories],
  );

  return { ...state, services };
}

