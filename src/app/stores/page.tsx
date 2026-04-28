import AppHeader from "@/components/AppHeader";
import { StoreList } from "@/components/stores/StoreList";
import { getCurrentOrgId } from "@/lib/org/current";
import {
  getBrands,
  getRegionGroups,
  getStores,
} from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function StoresPage() {
  const [brands, regionGroups, stores, orgId] = await Promise.all([
    getBrands(),
    getRegionGroups(),
    getStores(),
    getCurrentOrgId(),
  ]);

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-10">
        <h1 className="text-xl font-semibold text-neutral-900 sm:text-2xl">
          매장 관리
        </h1>
        <p className="mt-1 text-xs text-neutral-500 sm:text-sm">
          매장 추가 시 브랜드도 함께 등록할 수 있습니다. 주소를 선택하면 지역 그룹이 자동으로 매칭됩니다.
        </p>

        <div className="mt-4 sm:mt-6">
          <StoreList
            stores={stores}
            brands={brands}
            regionGroups={regionGroups}
            orgId={orgId}
          />
        </div>
      </main>
    </>
  );
}
