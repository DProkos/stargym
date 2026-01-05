import { Calendar, momentLocalizer, View } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useState } from 'react';
import './calendar-styles.css';

const localizer = momentLocalizer(moment);

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource?: any;
  status?: string;
}

interface BookingCalendarProps {
  events: CalendarEvent[];
  onSelectEvent?: (event: CalendarEvent) => void;
  defaultView?: View;
  views?: View[];
}

export default function BookingCalendar({ 
  events, 
  onSelectEvent,
  defaultView = 'month',
  views = ['month', 'week', 'day', 'agenda']
}: BookingCalendarProps) {
  const [view, setView] = useState<View>(defaultView);
  const [date, setDate] = useState(new Date());

  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = 'hsl(var(--primary))';
    
    if (event.status === 'cancelled') {
      backgroundColor = 'hsl(var(--destructive))';
    } else if (event.status === 'completed') {
      backgroundColor = 'hsl(var(--muted))';
    } else if (event.status === 'pending') {
      backgroundColor = 'hsl(45 93% 47%)'; // yellow
    } else if (event.status === 'rejected') {
      backgroundColor = 'hsl(0 84% 60%)'; // red
    } else if (event.status === 'available') {
      backgroundColor = 'hsl(142 76% 36%)'; // green for available classes
    } else if (event.status === 'full') {
      backgroundColor = 'hsl(0 0% 50%)'; // gray for full classes
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
      },
    };
  };

  return (
    <div className="min-h-[600px] h-[calc(100vh-350px)] bg-card rounded-lg p-4 border border-border overflow-hidden">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        onSelectEvent={onSelectEvent}
        eventPropGetter={eventStyleGetter}
        view={view}
        onView={setView}
        date={date}
        onNavigate={setDate}
        views={views}
        popup
        selectable
      />
    </div>
  );
}
