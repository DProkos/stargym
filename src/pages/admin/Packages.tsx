import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppSidebarAdmin } from '@/components/app-sidebar-admin';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, ArrowLeft, Save, X, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface ServicePackage {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_months: number;
  sessions_included: number;
  is_active: boolean;
  features: string[];
}

export default function Packages() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [editingPackage, setEditingPackage] = useState<ServicePackage | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newFeature, setNewFeature] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadPackages();
    }
  }, [isAdmin]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id);

    const hasAdminRole = roles?.some(r => r.role === 'admin');
    if (!hasAdminRole) {
      navigate('/');
      return;
    }

    setIsAdmin(true);
    setLoading(false);
  };

  const loadPackages = async () => {
    const { data, error } = await supabase
      .from('service_packages')
      .select('*')
      .order('price', { ascending: true });

    if (error) {
      toast({ title: 'Error loading packages', variant: 'destructive' });
      return;
    }

    const packagesWithFeatures = (data || []).map(pkg => ({
      ...pkg,
      features: Array.isArray(pkg.features) ? pkg.features as string[] : []
    }));

    setPackages(packagesWithFeatures);
  };

  const handleNewPackage = () => {
    setEditingPackage({
      id: '',
      name: '',
      description: '',
      price: 0,
      duration_months: 1,
      sessions_included: 0,
      is_active: true,
      features: []
    });
    setIsDialogOpen(true);
  };

  const handleEditPackage = (pkg: ServicePackage) => {
    setEditingPackage(pkg);
    setIsDialogOpen(true);
  };

  const handleSavePackage = async () => {
    if (!editingPackage) return;

    if (!editingPackage.name || editingPackage.price <= 0) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    if (editingPackage.id) {
      // Update existing
      const { error } = await supabase
        .from('service_packages')
        .update({
          name: editingPackage.name,
          description: editingPackage.description,
          price: editingPackage.price,
          duration_months: editingPackage.duration_months,
          sessions_included: editingPackage.sessions_included,
          is_active: editingPackage.is_active,
          features: editingPackage.features
        })
        .eq('id', editingPackage.id);

      if (error) {
        toast({ title: 'Error updating package', variant: 'destructive' });
        return;
      }
    } else {
      // Create new
      const { error } = await supabase
        .from('service_packages')
        .insert({
          name: editingPackage.name,
          description: editingPackage.description,
          price: editingPackage.price,
          duration_months: editingPackage.duration_months,
          sessions_included: editingPackage.sessions_included,
          is_active: editingPackage.is_active,
          features: editingPackage.features
        });

      if (error) {
        toast({ title: 'Error creating package', variant: 'destructive' });
        return;
      }
    }

    toast({ title: 'Package saved successfully' });
    setIsDialogOpen(false);
    setEditingPackage(null);
    loadPackages();
  };

  const handleAddFeature = () => {
    if (!editingPackage || !newFeature.trim()) return;

    setEditingPackage({
      ...editingPackage,
      features: [...editingPackage.features, newFeature]
    });
    setNewFeature('');
  };

  const handleRemoveFeature = (index: number) => {
    if (!editingPackage) return;

    setEditingPackage({
      ...editingPackage,
      features: editingPackage.features.filter((_, i) => i !== index)
    });
  };

  if (loading || !isAdmin) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebarAdmin />
        <div className="flex-1 min-w-0 flex flex-col">
          <header className="h-14 sm:h-16 border-b border-border flex items-center px-3 sm:px-6 sticky top-0 bg-background z-30">
            <SidebarTrigger />
            <h1 className="ml-2 sm:ml-4 text-lg sm:text-2xl font-bold truncate">Πακέτα Υπηρεσιών</h1>
          </header>
          <main className="flex-1 p-3 sm:p-6 overflow-auto">
            <div className="mb-4 sm:mb-6">
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/invoices')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="text-xs sm:text-sm">Πίσω στα Τιμολόγια</span>
              </Button>
            </div>

            <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm sm:text-base text-muted-foreground">
                  Δημιουργήστε και διαχειριστείτε πακέτα για γρήγορη τιμολόγηση
                </p>
              </div>
              <Button onClick={handleNewPackage} size="sm" className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Νέο Πακέτο
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {packages.map((pkg) => (
              <Card
                key={pkg.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleEditPackage(pkg)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      <CardTitle>{pkg.name}</CardTitle>
                    </div>
                    {pkg.is_active && <Badge>Active</Badge>}
                  </div>
                  <CardDescription>{pkg.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-3xl font-bold">€{parseFloat(String(pkg.price)).toFixed(2)}</div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>Duration: {pkg.duration_months} month(s)</p>
                      <p>Sessions: {pkg.sessions_included}</p>
                    </div>
                    {pkg.features && pkg.features.length > 0 && (
                      <div className="pt-3 border-t">
                        <p className="text-sm font-medium mb-2">Features:</p>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          {pkg.features.map((feature, idx) => (
                            <li key={idx}>• {feature}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingPackage?.id ? 'Επεξεργασία Πακέτου' : 'Νέο Πακέτο'}
                </DialogTitle>
                <DialogDescription>
                  Συμπληρώστε τα στοιχεία του πακέτου
                </DialogDescription>
              </DialogHeader>

              {editingPackage && (
                <div className="space-y-4">
                  <div>
                    <Label>Όνομα Πακέτου *</Label>
                    <Input
                      value={editingPackage.name}
                      onChange={(e) => setEditingPackage({ ...editingPackage, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Περιγραφή</Label>
                    <Textarea
                      value={editingPackage.description || ''}
                      onChange={(e) => setEditingPackage({ ...editingPackage, description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Τιμή (€) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={editingPackage.price}
                        onChange={(e) => setEditingPackage({ ...editingPackage, price: parseFloat(e.target.value) })}
                      />
                    </div>

                    <div>
                      <Label>Διάρκεια (μήνες)</Label>
                      <Input
                        type="number"
                        value={editingPackage.duration_months}
                        onChange={(e) => setEditingPackage({ ...editingPackage, duration_months: parseInt(e.target.value) })}
                      />
                    </div>

                    <div>
                      <Label>Sessions</Label>
                      <Input
                        type="number"
                        value={editingPackage.sessions_included}
                        onChange={(e) => setEditingPackage({ ...editingPackage, sessions_included: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={editingPackage.is_active}
                      onCheckedChange={(checked) => setEditingPackage({ ...editingPackage, is_active: checked })}
                    />
                    <Label>Ενεργό</Label>
                  </div>

                  <div>
                    <Label>Features</Label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        value={newFeature}
                        onChange={(e) => setNewFeature(e.target.value)}
                        placeholder="Add feature..."
                        onKeyPress={(e) => e.key === 'Enter' && handleAddFeature()}
                      />
                      <Button type="button" onClick={handleAddFeature}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-1">
                      {editingPackage.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm">{feature}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFeature(idx)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Ακύρωση
                    </Button>
                    <Button onClick={handleSavePackage}>
                      <Save className="h-4 w-4 mr-2" />
                      Αποθήκευση
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}