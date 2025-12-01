import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, User, Mail, Phone, MapPin } from 'lucide-react';
import { landlordsService, Landlord } from '@/services/landlordsService';

interface LandlordInfoCardProps {
  landlordId?: string;
}

export const LandlordInfoCard = React.memo(({ landlordId }: LandlordInfoCardProps) => {
  const [landlord, setLandlord] = useState<Landlord | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ignore = false;
    const loadLandlord = async () => {
      if (!landlordId) {
        setLandlord(null);
        return;
      }
      setLoading(true);
      try {
        const data = await landlordsService.getById(landlordId);
        if (!ignore) setLandlord(data);
      } catch (error) {
        console.error('Failed to load landlord:', error);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    loadLandlord();
    return () => { ignore = true; };
  }, [landlordId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-primary" />
            Landlord Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!landlord) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-primary" />
            Landlord Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No landlord assigned to this property</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="h-5 w-5 text-primary" />
          Landlord Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{landlord.name}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <a href={`mailto:${landlord.email}`} className="text-sm text-primary hover:underline">
            {landlord.email}
          </a>
        </div>
        
        {landlord.phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <a href={`tel:${landlord.phone}`} className="text-sm hover:underline">
              {landlord.phone}
            </a>
          </div>
        )}
        
        {landlord.office_address && (
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Office Address</p>
              <p className="text-sm">{landlord.office_address}</p>
            </div>
          </div>
        )}
        
        {landlord.postal_address && (
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Postal Address</p>
              <p className="text-sm">{landlord.postal_address}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

LandlordInfoCard.displayName = 'LandlordInfoCard';
