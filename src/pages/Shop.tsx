import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import {
  storefrontApiRequest,
  PRODUCTS_QUERY,
  type ShopifyProduct,
} from "@/integrations/shopify/storefront";
import { useCartStore } from "@/stores/cartStore";
import { CartDrawer } from "@/components/shop/CartDrawer";
import { toast } from "sonner";

export default function Shop() {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore((s) => s.addItem);
  const isLoading = useCartStore((s) => s.isLoading);

  useEffect(() => {
    (async () => {
      try {
        const data = await storefrontApiRequest(PRODUCTS_QUERY, { first: 50, query: null });
        setProducts(data?.data?.products?.edges ?? []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleAdd = async (p: ShopifyProduct) => {
    const v = p.node.variants.edges[0]?.node;
    if (!v) return;
    await addItem({
      product: p,
      variantId: v.id,
      variantTitle: v.title,
      price: v.price,
      quantity: 1,
      selectedOptions: v.selectedOptions || [],
    });
    toast.success(`Προστέθηκε: ${p.node.title}`, { position: "top-center" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 z-40 bg-background/80 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold">Star Gym Shop</Link>
          <CartDrawer />
        </div>
      </header>

      <section className="container mx-auto px-4 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">E-Shop</h1>
          <p className="text-muted-foreground">Apparel, equipment & supplements</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 border rounded-lg">
            <p className="text-xl mb-2">No products found</p>
            <p className="text-muted-foreground">
              Πες μου τι προϊόν θες να προσθέσω (όνομα, τιμή, περιγραφή) και θα το δημιουργήσω στο Shopify.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((p) => {
              const img = p.node.images?.edges?.[0]?.node;
              const price = p.node.priceRange.minVariantPrice;
              return (
                <Card key={p.node.id} className="overflow-hidden group">
                  <Link to={`/product/${p.node.handle}`} className="block aspect-square bg-muted overflow-hidden">
                    {img ? (
                      <img src={img.url} alt={img.altText ?? p.node.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">No image</div>
                    )}
                  </Link>
                  <div className="p-4 space-y-3">
                    <Link to={`/product/${p.node.handle}`}>
                      <h3 className="font-semibold line-clamp-1 hover:underline">{p.node.title}</h3>
                    </Link>
                    <p className="font-bold">{price.currencyCode} {parseFloat(price.amount).toFixed(2)}</p>
                    <Button onClick={() => handleAdd(p)} disabled={isLoading} className="w-full">
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Προσθήκη στο καλάθι"}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
