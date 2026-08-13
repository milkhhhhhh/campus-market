import Link from "next/link";

import { ListingType } from "@campus/shared";

import { formatPrice } from "@/lib/site-format";

export interface SiteListingCard {
  id: string;
  title: string;
  image: string | null;
  price: number;
  listingType: ListingType;
  badge?: string;
}

export function ProductCard({ item }: { item: SiteListingCard }) {
  const href =
    item.listingType === ListingType.RENT
      ? `/rentals/${item.id}`
      : `/products/${item.id}`;

  return (
    <Link
      href={href}
      className="overflow-hidden rounded-2xl bg-white shadow-[0_4px_16px_rgba(11,28,48,0.06)] transition hover:-translate-y-0.5"
    >
      <div className="relative aspect-square bg-[var(--cm-surface-low)]">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image}
            alt={item.title}
            className="h-full w-full object-cover"
          />
        ) : null}
        {item.badge ? (
          <span className="absolute left-2 top-2 rounded-full bg-[var(--cm-secondary)] px-2 py-0.5 text-xs font-bold text-[#3b2200]">
            {item.badge}
          </span>
        ) : null}
      </div>
      <div className="space-y-1.5 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
          {item.title}
        </h3>
        <p className="text-base font-bold text-[var(--cm-primary-container)]">
          {item.listingType === ListingType.RENT
            ? `${formatPrice(item.price)}/天`
            : formatPrice(item.price)}
        </p>
      </div>
    </Link>
  );
}
