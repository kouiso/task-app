import aspida from '@aspida/axios';

import api from '@/lib/aspida/$api';
import { axiosInstance } from '@/lib/axios';

export const apiClient = api(aspida(axiosInstance));
