export interface Doctor {
  id: number | string;
  city?: 'spb' | 'chel';
  qms_id?: string;
  pagetitle: string;
  alias: string;
  rank: string;
  experience: string | number;
  education: string;
  specialization: string;
  prodoctorov_link?: string;
  photo: string;
  seo?: { title: string; description: string };
  reviews?: any[];
  locations?: any[];
  tvs?: any;

  // WP specific fields
  description?: string;
  anonce?: string;
  activities?: string;
  education_history?: any[];
  badges?: any[];
  price?: number;
  duration?: number;
  is_child_doctor?: boolean;
  is_adult_doctor?: boolean;
  raw_data?: any;
}

export interface Service {
  id: number;
  pagetitle: string;
  alias: string;
  price_items: { name: string; price: number; code: string }[];
  linked_doctors: number[];
  category?: { id: number; pagetitle: string };
  doctors?: Doctor[];
  locations?: any[];
  seo: { title: string; description: string };
  tvs?: any;
  image?: string;
  description?: string;
}
