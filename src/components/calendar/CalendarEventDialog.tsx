import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { formatFullDate } from '@/utils/dateFormatUtils';
import { cn } from '@/lib/utils';
import { CalendarEvent, CalendarEventFormData, RECURRENCE_OPTIONS, DAYS_OF_WEEK } from '@/types/calendar';
import { usePropertyContext } from '@/contexts/property/PropertyContext';
import { Checkbox } from '@/components/ui/checkbox';

interface CalendarEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: CalendarEvent | null;
  initialDate?: Date;
  initialPropertyId?: string | null;
  onSave: (data: CalendarEventFormData) => Promise<void>;
  onDelete?: (eventId: string, deleteAllRecurring?: boolean) => Promise<void>;
  isLoading?: boolean;
}

export const CalendarEventDialog: React.FC<CalendarEventDialogProps> = ({
  open,
  onOpenChange,
  event,
  initialDate,
  initialPropertyId,
  onSave,
  onDelete,
  isLoading = false,
}) => {
  const { properties } = usePropertyContext();
  const isEditing = !!event;
  const isJobScheduleEvent = event?.sourceType === 'job_schedule';

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [eventDate, setEventDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<string>('weekly');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | undefined>();
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);

  // Sort properties alphabetically
  const sortedProperties = [...properties].sort((a, b) => 
    a.name.localeCompare(b.name)
  );

  // Initialize form when dialog opens or event changes
  useEffect(() => {
    if (open) {
      if (event) {
        setTitle(event.title);
        setDescription(event.description || '');
        setPropertyId(event.propertyId || null);
        setEventDate(parseISO(event.eventDate));
        setStartTime(event.startTime.substring(0, 5));
        setEndTime(event.endTime.substring(0, 5));
        setIsRecurring(!!event.recurrenceType);
        setRecurrenceType(event.recurrenceType || 'weekly');
        setRecurrenceEndDate(event.recurrenceEndDate ? parseISO(event.recurrenceEndDate) : undefined);
        setRecurrenceDays(event.recurrenceDays || []);
      } else {
        // Reset form for new event
        setTitle('');
        setDescription('');
        setPropertyId(initialPropertyId || null);
        setEventDate(initialDate || new Date());
        setStartTime('09:00');
        setEndTime('10:00');
        setIsRecurring(false);
        setRecurrenceType('weekly');
        setRecurrenceEndDate(undefined);
        setRecurrenceDays([]);
      }
    }
  }, [open, event, initialDate, initialPropertyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !eventDate) return;

    const formData: CalendarEventFormData = {
      title: title.trim(),
      description: description.trim() || undefined,
      propertyId: propertyId,
      eventDate: format(eventDate, 'yyyy-MM-dd'),
      startTime,
      endTime,
      isRecurring,
      recurrenceType: isRecurring ? recurrenceType as any : undefined,
      recurrenceEndDate: isRecurring && recurrenceEndDate ? format(recurrenceEndDate, 'yyyy-MM-dd') : undefined,
      recurrenceDays: isRecurring && recurrenceType === 'weekly' ? recurrenceDays : undefined,
    };

    await onSave(formData);
  };

  const handleDayToggle = (day: number) => {
    setRecurrenceDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-background">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? (isJobScheduleEvent ? 'View Scheduled Job' : 'Edit Event') : 'Add Event'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              disabled={isJobScheduleEvent}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Event description (optional)"
              disabled={isJobScheduleEvent}
              rows={3}
            />
          </div>

          {/* Property */}
          <div className="space-y-2">
            <Label>Property</Label>
            <Select
              value={propertyId || 'none'}
              onValueChange={(value) => setPropertyId(value === 'none' ? null : value)}
              disabled={isJobScheduleEvent}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select a property (optional)" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="none">No specific property</SelectItem>
                {sortedProperties.map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  disabled={isJobScheduleEvent}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !eventDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {eventDate ? formatFullDate(eventDate) : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover z-50" align="start">
                <Calendar
                  mode="single"
                  selected={eventDate}
                  onSelect={setEventDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time *</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={isJobScheduleEvent}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time *</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={isJobScheduleEvent}
                required
              />
            </div>
          </div>

          {/* Recurring Event Toggle - Only for manual events */}
          {!isJobScheduleEvent && (
            <div className="space-y-4 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label htmlFor="recurring" className="cursor-pointer">
                  Recurring Event
                </Label>
                <Switch
                  id="recurring"
                  checked={isRecurring}
                  onCheckedChange={setIsRecurring}
                />
              </div>

              {isRecurring && (
                <div className="space-y-4 pl-4 border-l-2 border-muted">
                  {/* Recurrence Type */}
                  <div className="space-y-2">
                    <Label>Repeat</Label>
                    <Select value={recurrenceType} onValueChange={setRecurrenceType}>
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        {RECURRENCE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Day Selection for Weekly */}
                  {recurrenceType === 'weekly' && (
                    <div className="space-y-2">
                      <Label>On days</Label>
                      <div className="flex flex-wrap gap-2">
                        {DAYS_OF_WEEK.map((day) => (
                          <label
                            key={day.value}
                            className="flex items-center gap-1.5 cursor-pointer"
                          >
                            <Checkbox
                              checked={recurrenceDays.includes(day.value)}
                              onCheckedChange={() => handleDayToggle(day.value)}
                            />
                            <span className="text-sm">{day.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recurrence End Date */}
                  <div className="space-y-2">
                    <Label>Ends</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !recurrenceEndDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {recurrenceEndDate ? formatFullDate(recurrenceEndDate) : 'No end date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-popover z-50" align="start">
                        <Calendar
                          mode="single"
                          selected={recurrenceEndDate}
                          onSelect={setRecurrenceEndDate}
                          disabled={(date) => eventDate ? date < eventDate : false}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 pt-4">
            {isEditing && !isJobScheduleEvent && onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => onDelete(event!.id, !!event?.recurrenceType)}
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {!isJobScheduleEvent && (
              <Button type="submit" disabled={isLoading || !title.trim() || !eventDate}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? 'Save Changes' : 'Add Event'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
