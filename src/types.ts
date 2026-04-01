export interface Doctor {
  id: number;
  pagetitle: string;
  alias: string;
  rank: string;
  experience: string;
  education: string;
  specialization: string;
  prodoctorov_link: string;
  photo: string;
  seo: { title: string; description: string };
  reviews?: any[];
  locations?: any[];
  tvs?: any;
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
