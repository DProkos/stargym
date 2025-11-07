import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebarAdmin } from '@/components/app-sidebar-admin';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface MembershipTier {
  id: string;
  name: string;
  description: string;
  price: number;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
  features: string[];
  duration_months: number;
  is_active: boolean;
  display_order: number;
}

interface Subscription {
  id: string;
  user_id: string;
  tier_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  profiles: { email: string; full_name: string };
  membership_tiers: { name: string };
}

export default function Settings() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<MembershipTier | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stripe_price_id: '',
    stripe_product_id: '',
    features: '',
    duration_months: '1',
    is_active: true,
    display_order: '0',
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadTiers();
      loadSubscriptions();
    }
  }, [isAdmin]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single();

    if (roleData?.role !== 'admin') {
      navigate('/');
      return;
    }

    setIsAdmin(true);
  };

  const loadTiers = async () => {
    const { data, error } = await supabase
      .from('membership_tiers')
      .select('*')
      .order('display_order');

    if (error) {
      toast.error('Failed to load membership tiers');
      return;
    }

    setTiers((data || []).map(tier => ({
      ...tier,
      features: Array.isArray(tier.features) ? tier.features.map(f => String(f)) : []
    })));
  };

  const loadSubscriptions = async () => {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        membership_tiers(name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load subscriptions');
      return;
    }

    // Fetch profiles separately
    const subsWithProfiles = await Promise.all((data || []).map(async (sub) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', sub.user_id)
        .single();
      
      return {
        ...sub,
        profiles: profile || { email: '', full_name: '' }
      };
    }));

    setSubscriptions(subsWithProfiles as any);
  };

  const handleOpenDialog = (tier?: MembershipTier) => {
    if (tier) {
      setEditingTier(tier);
      setFormData({
        name: tier.name,
        description: tier.description || '',
        price: tier.price.toString(),
        stripe_price_id: tier.stripe_price_id || '',
        stripe_product_id: tier.stripe_product_id || '',
        features: tier.features.join('\n'),
        duration_months: tier.duration_months.toString(),
        is_active: tier.is_active,
        display_order: tier.display_order.toString(),
      });
    } else {
      setEditingTier(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        stripe_price_id: '',
        stripe_product_id: '',
        features: '',
        duration_months: '1',
        is_active: true,
        display_order: '0',
      });
    }
    setIsDialogOpen(true);
  };

  const handleSaveTier = async () => {
    const tierData = {
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price),
      stripe_price_id: formData.stripe_price_id || null,
      stripe_product_id: formData.stripe_product_id || null,
      features: formData.features.split('\n').filter(f => f.trim()),
      duration_months: parseInt(formData.duration_months),
      is_active: formData.is_active,
      display_order: parseInt(formData.display_order),
    };

    if (editingTier) {
      const { error } = await supabase
        .from('membership_tiers')
        .update(tierData)
        .eq('id', editingTier.id);

      if (error) {
        toast.error('Failed to update membership tier');
        return;
      }
      toast.success('Membership tier updated');
    } else {
      const { error } = await supabase
        .from('membership_tiers')
        .insert([tierData]);

      if (error) {
        toast.error('Failed to create membership tier');
        return;
      }
      toast.success('Membership tier created');
    }

    setIsDialogOpen(false);
    loadTiers();
  };

  const handleDeleteTier = async (id: string) => {
    if (!confirm('Are you sure you want to delete this membership tier?')) return;

    const { error } = await supabase
      .from('membership_tiers')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete membership tier');
      return;
    }

    toast.success('Membership tier deleted');
    loadTiers();
  };

  if (!isAdmin) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebarAdmin />
        <main className="flex-1">
          <div className="border-b">
            <div className="flex h-16 items-center px-6">
              <SidebarTrigger />
              <h1 className="text-2xl font-bold ml-4">Settings</h1>
            </div>
          </div>

          <div className="p-6">
            <Tabs defaultValue="memberships" className="space-y-4">
              <TabsList>
                <TabsTrigger value="memberships">Membership Tiers</TabsTrigger>
                <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
                <TabsTrigger value="stripe">Stripe Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="memberships" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>Membership Tiers</CardTitle>
                        <CardDescription>Manage membership plans and pricing</CardDescription>
                      </div>
                      <Button onClick={() => handleOpenDialog()}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Tier
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tiers.map((tier) => (
                          <TableRow key={tier.id}>
                            <TableCell className="font-medium">{tier.name}</TableCell>
                            <TableCell>${tier.price}/mo</TableCell>
                            <TableCell>{tier.duration_months} month(s)</TableCell>
                            <TableCell>
                              <span className={tier.is_active ? 'text-green-600' : 'text-red-600'}>
                                {tier.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenDialog(tier)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteTier(tier.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="subscriptions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Active Subscriptions</CardTitle>
                    <CardDescription>View and manage user subscriptions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Period End</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subscriptions.map((sub) => (
                          <TableRow key={sub.id}>
                            <TableCell>
                              {sub.profiles?.full_name || sub.profiles?.email}
                            </TableCell>
                            <TableCell>{sub.membership_tiers?.name}</TableCell>
                            <TableCell>
                              <span className={sub.status === 'active' ? 'text-green-600' : 'text-yellow-600'}>
                                {sub.status}
                              </span>
                            </TableCell>
                            <TableCell>
                              {sub.current_period_end 
                                ? new Date(sub.current_period_end).toLocaleDateString()
                                : 'N/A'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="stripe" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Stripe Configuration</CardTitle>
                    <CardDescription>Configure Stripe API keys and webhooks</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Stripe Publishable Key</Label>
                      <Input placeholder="pk_test_..." />
                      <p className="text-sm text-muted-foreground">
                        Add your Stripe publishable key to enable checkout
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Stripe Secret Key</Label>
                      <Input type="password" placeholder="sk_test_..." />
                      <p className="text-sm text-muted-foreground">
                        Your secret key is stored securely and never exposed to clients
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Webhook Endpoint</Label>
                      <Input 
                        readOnly 
                        value={`${window.location.origin}/api/stripe-webhook`}
                        className="bg-muted"
                      />
                      <p className="text-sm text-muted-foreground">
                        Configure this webhook URL in your Stripe dashboard
                      </p>
                    </div>
                    <Button>Save Stripe Settings</Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTier ? 'Edit' : 'Add'} Membership Tier</DialogTitle>
            <DialogDescription>
              Configure membership plan details and pricing
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Basic, Premium, VIP"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this tier"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price (per month)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="29.99"
                />
              </div>
              <div className="space-y-2">
                <Label>Duration (months)</Label>
                <Input
                  type="number"
                  value={formData.duration_months}
                  onChange={(e) => setFormData({ ...formData, duration_months: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Stripe Product ID</Label>
                <Input
                  value={formData.stripe_product_id}
                  onChange={(e) => setFormData({ ...formData, stripe_product_id: e.target.value })}
                  placeholder="prod_..."
                />
              </div>
              <div className="space-y-2">
                <Label>Stripe Price ID</Label>
                <Input
                  value={formData.stripe_price_id}
                  onChange={(e) => setFormData({ ...formData, stripe_price_id: e.target.value })}
                  placeholder="price_..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Features (one per line)</Label>
              <Textarea
                value={formData.features}
                onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                placeholder="Unlimited classes&#10;Personal trainer&#10;Nutrition plan"
                rows={5}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTier}>
              {editingTier ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
