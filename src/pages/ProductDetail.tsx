import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import {
  storefrontApiRequest,
  PRODUCT_BY_HANDLE_QUERY,
} from "@/integrations/shopify/storefront";
import { useCartStore } from "@/stores/cartStore";
import { CartDrawer } from "@/components/shop/CartDrawer";
import { toast } from "sonner";

export default function ProductDetail() {
  const { handle } = useParams<{ handle: string }>();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [variantId, setVariantId] = useState<string>("");
  const addItem = useCartStore((s) => s.addItem);
  const isLoading = useCartStore((s) => s.isLoading);

  useEffect(() => {
    if (!handle) return;
    (async () => {
      try {
        const data = await storefrontApiRequest(PRODUCT_BY_HANDLE_QUERY, { handle });
        const p = data?.data?.product;
        setProduct(p);
        setVariantId(p?.variants?.edges?.[0]?.node?.id ?? "");
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [handle]);

  const handleAdd = async () => {
    if (!product) return;
    const v = product.variants.edges.find((e: any) => e.node.id === variantId)?.node;
    if (!v) return;
    await addItem({
      product: { node: product },
      variantId: v.id,
      variantTitle: v.title,
      price: v.price,
      quantity: 1,
      selectedOptions: v.selectedOptions || [],
    });
    toast.success("Προστέθηκε στο καλάθι", { position: "top-center" });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!product) return <div className="min-h-screen flex items-center justify-center">Δεν βρέθηκε προϊόν</div>;

  const img = product.images?.edges?.[0]?.node;
  const variants = product.variants.edges.map((e: any) => e.node);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 z-40 bg-background/80 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/shop" className="flex items-center gap-2"><ArrowLeft className="h-4 w-4" />Shop</Link>
          <CartDrawer />
        </div>
      </header>
      <div className="container mx-auto px-4 py-10 grid md:grid-cols-2 gap-10">
        <div className="aspect-square bg-muted rounded-lg overflow-hidden">
          {img && <img src={img.url} alt={img.altText ?? product.title} className="w-full h-full object-cover" />}
        </div>
        <div className="space-y-5">
          <h1 className="text-3xl font-bold">{product.title}</h1>
          <p className="text-2xl font-semibold">
            {product.priceRange.minVariantPrice.currencyCode} {parseFloat(product.priceRange.minVariantPrice.amount).toFixed(2)}
          </p>
          <p className="text-muted-foreground whitespace-pre-line">{product.description}</p>

          {variants.length > 1 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Παραλλαγή</label>
              <select value={variantId} onChange={(e) => setVariantId(e.target.value)} className="w-full border rounded-md h-10 px-3 bg-background">
                {variants.map((v: any) => (
                  <option key={v.id} value={v.id} disabled={!v.availableForSale}>
                    {v.title} {v.availableForSale ? "" : "(Sold out)"}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button onClick={handleAdd} disabled={isLoading} size="lg" className="w-full">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Προσθήκη στο καλάθι"}
          </Button>
        </div>
      </div>
    </div>
  );
}
