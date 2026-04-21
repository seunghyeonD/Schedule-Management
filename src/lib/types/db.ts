// Supabase 테이블 타입 (수동 정의 — 추후 supabase gen types로 자동화 가능)

export type RegionGroup = {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

export type RegionMapping = {
  id: string;
  sido: string;
  sigungu: string;
  region_group_id: string;
  created_at: string;
};

export type Brand = {
  id: string;
  name: string;
  created_by: string | null;
  created_at: string;
};

export type Store = {
  id: string;
  brand_id: string;
  name: string;
  address: string | null;
  address_detail: string | null;
  postal_code: string | null;
  sido: string | null;
  sigungu: string | null;
  region_group_id: string | null;
  lat: number | null;
  lng: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type Visit = {
  id: string;
  user_id: string;
  store_id: string;
  visit_date: string;
  visit_order: number;
  note: string | null;
  created_at: string;
};
