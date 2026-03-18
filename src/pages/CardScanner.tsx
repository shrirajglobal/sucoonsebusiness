import { useState, useRef, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateContact } from '@/hooks/useContactsData';
import { useCreateCardScan } from '@/hooks/useContactsData';
import { useCreateLead } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Camera, Upload, Loader2, Check, RotateCcw, ScanLine } from 'lucide-react';

interface ExtractedData {
  name?: string;
  company?: string;
  designation?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
}

export default function CardScanner() {
  const { user, businessId } = useAuth();
  const createContact = useCreateContact();
  const createCardScan = useCreateCardScan();
  const createLead = useCreateLead();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [editedData, setEditedData] = useState<ExtractedData>({});
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [addToCRM, setAddToCRM] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10MB'); return; }
    setImageFile(file);
    setExtracted(null);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const extractFromCard = async () => {
    if (!imagePreview) return;
    setExtracting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await supabase.functions.invoke('card-scanner', {
        body: { image: imagePreview },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.error) throw res.error;
      const data = res.data?.extracted as ExtractedData;
      if (!data || !data.name) {
        toast.error('Could not extract contact details. Try a clearer image.');
        return;
      }
      setExtracted(data);
      setEditedData(data);
      setSaveDialogOpen(true);
      toast.success('Card details extracted!');
    } catch (err: any) {
      console.error('Extraction error:', err);
      toast.error(err.message || 'Failed to extract card details');
    } finally {
      setExtracting(false);
    }
  };

  const handleSave = async () => {
    if (!editedData.name?.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      // Upload image to storage
      let imageUrl = '';
      if (imageFile) {
        const ext = imageFile.name.split('.').pop();
        const path = `${businessId}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('card-scans').upload(path, imageFile);
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('card-scans').getPublicUrl(path);
          imageUrl = urlData.publicUrl;
        }
      }

      // Save contact
      const contact = await createContact.mutateAsync({
        business_id: businessId!,
        name: editedData.name!,
        company: editedData.company || undefined,
        designation: editedData.designation || undefined,
        phone: editedData.phone || undefined,
        email: editedData.email || undefined,
        address: editedData.address || undefined,
        website: editedData.website || undefined,
        source: 'card_scan',
      });

      // Save card scan record
      await createCardScan.mutateAsync({
        business_id: businessId!,
        image_url: imageUrl,
        extracted_data: editedData as Record<string, unknown>,
        contact_id: contact.id,
        scanned_by: user?.id,
      });

      // Optionally add to CRM
      if (addToCRM) {
        await createLead.mutateAsync({
          business_id: businessId!,
          name: editedData.name!,
          company: editedData.company || undefined,
          phone: editedData.phone || undefined,
          email: editedData.email || undefined,
          source: 'Card Scan',
          stage: 'New Lead',
        });
        toast.success('Contact saved & added to CRM!');
      } else {
        toast.success('Contact saved from card!');
      }

      // Reset
      setSaveDialogOpen(false);
      setImagePreview(null);
      setImageFile(null);
      setExtracted(null);
      setEditedData({});
      setAddToCRM(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setImagePreview(null);
    setImageFile(null);
    setExtracted(null);
    setEditedData({});
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold">Card Scanner</h1>
          <p className="text-xs text-muted-foreground">Scan visiting cards to extract contact details with AI</p>
        </div>

        <Card className="p-4 card-shadow">
          {!imagePreview ? (
            <div className="text-center space-y-4 py-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <ScanLine className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Scan a Visiting Card</p>
                <p className="text-xs text-muted-foreground mt-1">Take a photo or upload an image of a visiting card</p>
              </div>
              <div className="flex gap-2 justify-center">
                <Button size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Camera className="w-4 h-4 mr-1" /> Take Photo
                </Button>
                <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-1" /> Upload
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative rounded-lg overflow-hidden bg-muted">
                <img src={imagePreview} alt="Card preview" className="w-full max-h-64 object-contain" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={extractFromCard} disabled={extracting}>
                  {extracting ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Extracting...</> : <><Check className="w-4 h-4 mr-1" /> Extract Details</>}
                </Button>
                <Button size="sm" variant="outline" onClick={reset}>
                  <RotateCcw className="w-4 h-4 mr-1" /> Retake
                </Button>
              </div>
              {extracted && (
                <div className="bg-success/10 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-medium text-success">✓ Details extracted successfully</p>
                  <p className="text-sm font-semibold">{extracted.name}</p>
                  {extracted.designation && <p className="text-xs text-muted-foreground">{extracted.designation} at {extracted.company}</p>}
                  {extracted.phone && <p className="text-xs">📞 {extracted.phone}</p>}
                  {extracted.email && <p className="text-xs">✉️ {extracted.email}</p>}
                  <Button size="sm" className="mt-2" onClick={() => setSaveDialogOpen(true)}>Save Contact</Button>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Recent scans info */}
        <Card className="p-3 card-shadow">
          <p className="text-xs text-muted-foreground text-center">
            💡 Tip: For best results, ensure the card is well-lit and text is clearly visible
          </p>
        </Card>
      </div>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Confirm Contact Details</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">Review and edit the extracted details before saving.</p>
          <div className="space-y-3">
            <div><Label className="text-xs">Name *</Label><Input value={editedData.name || ''} onChange={e => setEditedData(d => ({ ...d, name: e.target.value }))} className="h-8 text-sm" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Company</Label><Input value={editedData.company || ''} onChange={e => setEditedData(d => ({ ...d, company: e.target.value }))} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Designation</Label><Input value={editedData.designation || ''} onChange={e => setEditedData(d => ({ ...d, designation: e.target.value }))} className="h-8 text-sm" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Phone</Label><Input value={editedData.phone || ''} onChange={e => setEditedData(d => ({ ...d, phone: e.target.value }))} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Email</Label><Input value={editedData.email || ''} onChange={e => setEditedData(d => ({ ...d, email: e.target.value }))} className="h-8 text-sm" /></div>
            </div>
            <div><Label className="text-xs">Address</Label><Input value={editedData.address || ''} onChange={e => setEditedData(d => ({ ...d, address: e.target.value }))} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Website</Label><Input value={editedData.website || ''} onChange={e => setEditedData(d => ({ ...d, website: e.target.value }))} className="h-8 text-sm" /></div>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox id="addCrm" checked={addToCRM} onCheckedChange={(v) => setAddToCRM(!!v)} />
              <Label htmlFor="addCrm" className="text-xs">Also add as CRM lead</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
              Save Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
