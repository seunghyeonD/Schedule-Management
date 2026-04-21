import AppHeader from "@/components/AppHeader";
import { BrandForm } from "@/components/stores/BrandForm";
import { BrandList } from "@/components/stores/BrandList";
import { StoreForm } from "@/components/stores/StoreForm";
import { StoreList } from "@/components/stores/StoreList";
import {
  getBrands,
  getRegionGroups,
  getStores,
} from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function StoresPage() {
  const [brands, regionGroups, stores] = await Promise.all([
    getBrands(),
    getRegionGroups(),
    getStores(),
  ]);

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-2xl font-semibold text-neutral-900">매장 관리</h1>
        <p className="mt-1 text-sm text-neutral-500">
          브랜드와 매장을 등록합니다. 주소를 선택하면 지역 그룹이 자동으로 매칭됩니다.
        </p>

        <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-neutral-800">브랜드</h2>
          <div className="mt-3">
            <BrandForm />
          </div>
          <div className="mt-3">
            <BrandList brands={brands} />
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-neutral-800">매장 추가</h2>
          <div className="mt-3">
            <StoreForm brands={brands} regionGroups={regionGroups} />
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-neutral-800">매장 목록</h2>
          <div className="mt-3">
            <StoreList stores={stores} />
          </div>
        </section>
      </main>
    </>
  );
}
