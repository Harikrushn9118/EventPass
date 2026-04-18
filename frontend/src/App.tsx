import { useDeferredValue, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import './App.css';
import type {
  EventRecord,
  EventRegistration,
  EventStatus,
  LoginFormState,
  RegisterFormState,
  Role,
  SessionState,
  TicketRecord,
} from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api';

const defaultRegisterForm: RegisterFormState = {
  name: '',
  email: '',
  password: '',
  role: 'STUDENT',
};

const defaultLoginForm: LoginFormState = {
  email: '',
  password: '',
};

const defaultEventForm = {
  title: '',
  description: '',
  date: '',
  venue: '',
  maxCapacity: 100,
};

const eventStatusOptions: EventStatus[] = ['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'];

const formatDate = (value: string) =>
  new Date(value).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

const getAvailableSeats = (event: EventRecord) =>
  event.availableSeats ?? Math.max(event.maxCapacity - (event._count?.registrations ?? 0), 0);

const getCapacityPercentage = (event: EventRecord) => {
  const sold = event.maxCapacity - getAvailableSeats(event);
  return Math.min(100, Math.max(0, (sold / event.maxCapacity) * 100));
};

function App() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [myEvents, setMyEvents] = useState<EventRecord[]>([]);
  const [registrationsByEvent, setRegistrationsByEvent] = useState<Record<string, EventRegistration[]>>({});
  const [registerForm, setRegisterForm] = useState(defaultRegisterForm);
  const [loginForm, setLoginForm] = useState(defaultLoginForm);
  const [eventForm, setEventForm] = useState(defaultEventForm);
  const [statusDrafts, setStatusDrafts] = useState<Record<string, EventStatus>>({});
  const [selectedCheckInEventId, setSelectedCheckInEventId] = useState('');
  const [ticketUUID, setTicketUUID] = useState('');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('Welcome to EventPass. Sign in to start managing registrations and entry.');
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<SessionState | null>(() => {
    const stored = localStorage.getItem('eventpass-session');
    return stored ? (JSON.parse(stored) as SessionState) : null;
  });

  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    const token = session?.token;

    void (async () => {
      try {
        setLoading(true);
        const data = await apiRequest<EventRecord[]>('/events', {}, token);
        setEvents(data);
      } catch (error) {
        setMessage((error as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [session?.token]);

  useEffect(() => {
    if (!session) {
      return;
    }

    void (async () => {
      try {
        if (session.user.role === 'STUDENT') {
          const data = await apiRequest<TicketRecord[]>('/registrations/my-tickets', {}, session.token);
          setTickets(data);
        }

        if (session.user.role === 'ORGANIZER') {
          const data = await apiRequest<EventRecord[]>('/events/my-events', {}, session.token);
          setMyEvents(data);
          setStatusDrafts(
            Object.fromEntries(data.map((event) => [event.id, event.status])) as Record<string, EventStatus>
          );
          if (!selectedCheckInEventId && data[0]) {
            setSelectedCheckInEventId(data[0].id);
          }
        }
      } catch (error) {
        setMessage((error as Error).message);
      }
    })();
  }, [selectedCheckInEventId, session]);

  async function apiRequest<T>(path: string, options: RequestInit = {}, token?: string) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.message ?? 'Something went wrong');
    }

    return payload.data as T;
  }

  async function loadEvents() {
    try {
      setLoading(true);
      const token = session?.token;
      const data = await apiRequest<EventRecord[]>('/events', {}, token);
      setEvents(data);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function loadTickets(token: string) {
    try {
      const data = await apiRequest<TicketRecord[]>('/registrations/my-tickets', {}, token);
      setTickets(data);
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  async function loadMyEvents(token: string) {
    try {
      const data = await apiRequest<EventRecord[]>('/events/my-events', {}, token);
      setMyEvents(data);
      setStatusDrafts(
        Object.fromEntries(data.map((event) => [event.id, event.status])) as Record<string, EventStatus>
      );
      if (!selectedCheckInEventId && data[0]) {
        setSelectedCheckInEventId(data[0].id);
      }
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  async function loadRegistrations(eventId: string) {
    if (!session) {
      return;
    }

    try {
      const data = await apiRequest<EventRegistration[]>(`/events/${eventId}/registrations`, {}, session.token);
      setRegistrationsByEvent((current) => ({
        ...current,
        [eventId]: data,
      }));
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  async function handleRegisterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setLoading(true);
      const data = await apiRequest<SessionState>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(registerForm),
      });

      setSession(data);
      localStorage.setItem('eventpass-session', JSON.stringify(data));
      setRegisterForm(defaultRegisterForm);
      setMessage(`Account created for ${data.user.name}.`);
      await loadEvents();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setLoading(true);
      const data = await apiRequest<SessionState>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginForm),
      });

      setSession(data);
      localStorage.setItem('eventpass-session', JSON.stringify(data));
      setLoginForm(defaultLoginForm);
      setMessage(`Welcome back, ${data.user.name}.`);
      await loadEvents();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterForEvent(eventId: string) {
    if (!session) {
      setMessage('Sign in as a student to register for an event.');
      return;
    }

    try {
      setLoading(true);
      await apiRequest(
        '/registrations/register',
        {
          method: 'POST',
          body: JSON.stringify({ eventId }),
        },
        session.token
      );
      setMessage('Registration successful. Your ticket is now in My Tickets.');
      await Promise.all([loadEvents(), loadTickets(session.token)]);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) {
      return;
    }

    try {
      setLoading(true);
      await apiRequest(
        '/events',
        {
          method: 'POST',
          body: JSON.stringify({
            ...eventForm,
            date: new Date(eventForm.date).toISOString(),
            maxCapacity: Number(eventForm.maxCapacity),
          }),
        },
        session.token
      );
      setEventForm(defaultEventForm);
      setMessage('Event created successfully.');
      await Promise.all([loadEvents(), loadMyEvents(session.token)]);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusUpdate(eventId: string) {
    if (!session) {
      return;
    }

    try {
      setLoading(true);
      await apiRequest(
        `/events/${eventId}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: statusDrafts[eventId] }),
        },
        session.token
      );
      setMessage('Event status updated.');
      await Promise.all([loadEvents(), loadMyEvents(session.token)]);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !selectedCheckInEventId) {
      return;
    }

    try {
      setLoading(true);
      await apiRequest(
        '/registrations/check-in',
        {
          method: 'POST',
          body: JSON.stringify({
            eventId: selectedCheckInEventId,
            ticketUUID,
          }),
        },
        session.token
      );
      setTicketUUID('');
      setMessage('Ticket checked in successfully.');
      await loadRegistrations(selectedCheckInEventId);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    setSession(null);
    setTickets([]);
    setMyEvents([]);
    setRegistrationsByEvent({});
    localStorage.removeItem('eventpass-session');
    setMessage('Session cleared.');
  }

  const filteredEvents = events.filter((event) => {
    const query = deferredSearch.trim().toLowerCase();
    if (!query) {
      return true;
    }

    return [event.title, event.venue, event.description].join(' ').toLowerCase().includes(query);
  });

  const upcomingEvents = events.filter((event) => event.status === 'UPCOMING').length;
  const bookedSeats = events.reduce((sum, event) => sum + (event.maxCapacity - getAvailableSeats(event)), 0);
  const registrationsLoaded = Object.values(registrationsByEvent).reduce((sum, group) => sum + group.length, 0);
  const spotlightEvent = filteredEvents[0];

  return (
    <div className="page-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark">EP</span>
          <div>
            <p className="micro-label">EventPass</p>
            <h1 className="brand-title">Campus event command center</h1>
          </div>
        </div>

        <div className="topbar-actions">
          <div className="session-flag">
            <span className="micro-label">Session</span>
            <strong>{session ? `${session.user.name} · ${session.user.role}` : 'Guest mode'}</strong>
          </div>
          <button className="ghost-button" onClick={() => void loadEvents()} disabled={loading}>
            Refresh live feed
          </button>
        </div>
      </header>

      <section className="hero-stage">
        <div className="hero-copy">
          <p className="section-tag">Ticketing, capacity, and check-in in one flow</p>
          <h2 className="hero-title">A sharper frontend for college events that feels designed, not generated.</h2>
          <p className="hero-text">
            EventPass gives students a clear path from discovery to ticket ownership and gives organizers a control
            room for seat management, registrations, and gate entry verification.
          </p>
          <div className="hero-pill-row">
            <span>Role-based access</span>
            <span>Secure UUID passes</span>
            <span>Live seat visibility</span>
            <span>Organizer check-in console</span>
          </div>
        </div>

        <aside className="spotlight-card">
          <p className="micro-label">Spotlight event</p>
          {spotlightEvent ? (
            <>
              <div className="spotlight-topline">
                <span className={`status-chip status-${spotlightEvent.status.toLowerCase()}`}>{spotlightEvent.status}</span>
                <span>{getAvailableSeats(spotlightEvent)} seats left</span>
              </div>
              <h3>{spotlightEvent.title}</h3>
              <p>{spotlightEvent.description}</p>
              <div className="spotlight-meta">
                <div>
                  <span className="micro-label">When</span>
                  <strong>{formatDate(spotlightEvent.date)}</strong>
                </div>
                <div>
                  <span className="micro-label">Where</span>
                  <strong>{spotlightEvent.venue}</strong>
                </div>
              </div>
              <div className="capacity-meter">
                <div className="capacity-track">
                  <span style={{ width: `${getCapacityPercentage(spotlightEvent)}%` }} />
                </div>
                <div className="capacity-caption">
                  <span>{spotlightEvent.maxCapacity - getAvailableSeats(spotlightEvent)} booked</span>
                  <span>{spotlightEvent.maxCapacity} total</span>
                </div>
              </div>
            </>
          ) : (
            <p className="empty-state">No events yet. Create the first campus experience from the organizer panel.</p>
          )}
        </aside>
      </section>

      <section className="metric-ribbon">
        <article className="metric-card">
          <span className="metric-label">Visible events</span>
          <strong>{events.length}</strong>
          <p>Public event feed available to students and guests.</p>
        </article>
        <article className="metric-card">
          <span className="metric-label">Upcoming now</span>
          <strong>{upcomingEvents}</strong>
          <p>Events currently open for fresh registrations.</p>
        </article>
        <article className="metric-card">
          <span className="metric-label">Tickets in account</span>
          <strong>{tickets.length}</strong>
          <p>Your personal event passes and attendance trail.</p>
        </article>
        <article className="metric-card">
          <span className="metric-label">Loaded registrations</span>
          <strong>{registrationsLoaded}</strong>
          <p>Organizer-side attendee records currently loaded.</p>
        </article>
        <article className="metric-card metric-card-accent">
          <span className="metric-label">Booked seats</span>
          <strong>{bookedSeats}</strong>
          <p>Total registrations captured across the live feed.</p>
        </article>
      </section>

      <section className="message-banner">
        <span className={loading ? 'signal-dot active' : 'signal-dot'} />
        <div>
          <span className="micro-label">System message</span>
          <p>{message}</p>
        </div>
      </section>

      <main className="app-grid">
        <section className="main-column">
          <section className="panel event-panel">
            <div className="panel-header row-layout">
              <div>
                <p className="section-tag">Discover events</p>
                <h3 className="panel-title">Browse the live campus lineup</h3>
              </div>
              <label className="search-shell">
                <span className="micro-label">Search</span>
                <input
                  className="search-input"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Hackathon, auditorium, workshop..."
                />
              </label>
            </div>

            <div className="event-grid">
              {filteredEvents.length === 0 ? (
                <div className="empty-panel">
                  <p className="section-tag">No matches</p>
                  <h4>Try another search term</h4>
                  <p>The feed is active, but nothing matched your current query.</p>
                </div>
              ) : (
                filteredEvents.map((event) => (
                  <article key={event.id} className="event-card">
                    <div className="event-card-top">
                      <span className={`status-chip status-${event.status.toLowerCase()}`}>{event.status}</span>
                      <span className="event-seat-count">{getAvailableSeats(event)} seats left</span>
                    </div>

                    <div className="event-card-copy">
                      <h4>{event.title}</h4>
                      <p>{event.description}</p>
                    </div>

                    <div className="event-facts">
                      <div>
                        <span className="micro-label">Date</span>
                        <strong>{formatDate(event.date)}</strong>
                      </div>
                      <div>
                        <span className="micro-label">Venue</span>
                        <strong>{event.venue}</strong>
                      </div>
                    </div>

                    <div className="capacity-meter">
                      <div className="capacity-track">
                        <span style={{ width: `${getCapacityPercentage(event)}%` }} />
                      </div>
                      <div className="capacity-caption">
                        <span>{event.maxCapacity - getAvailableSeats(event)} booked</span>
                        <span>{event.maxCapacity} total</span>
                      </div>
                    </div>

                    <button
                      className="primary-button"
                      disabled={loading || session?.user.role !== 'STUDENT' || event.status !== 'UPCOMING' || Boolean(event.isFull)}
                      onClick={() => void handleRegisterForEvent(event.id)}
                    >
                      {session?.user.role === 'STUDENT' ? 'Claim ticket' : 'Login as student to book'}
                    </button>
                  </article>
                ))
              )}
            </div>
          </section>

          {session?.user.role === 'STUDENT' && (
            <section className="panel dashboard-panel">
              <div className="panel-header">
                <p className="section-tag">Student dashboard</p>
                <h3 className="panel-title">Your ticket archive</h3>
              </div>

              <div className="ticket-wall">
                {tickets.length === 0 ? (
                  <div className="empty-panel">
                    <h4>No active tickets yet</h4>
                    <p>Register for an upcoming event and your secure UUID pass will appear here instantly.</p>
                  </div>
                ) : (
                  tickets.map((ticket) => (
                    <article key={ticket.id} className="ticket-card">
                      <div className="ticket-card-header">
                        <div>
                          <span className="section-tag">Digital pass</span>
                          <h4>{ticket.event.title}</h4>
                        </div>
                        <span className={ticket.attended ? 'ticket-badge ticket-badge-used' : 'ticket-badge'}>
                          {ticket.attended ? 'Checked in' : 'Ready'}
                        </span>
                      </div>

                      <div className="ticket-card-grid">
                        <div>
                          <span className="micro-label">Venue</span>
                          <strong>{ticket.event.venue}</strong>
                        </div>
                        <div>
                          <span className="micro-label">Time</span>
                          <strong>{formatDate(ticket.event.date)}</strong>
                        </div>
                      </div>

                      <div className="ticket-code-block">
                        <span className="micro-label">Ticket UUID</span>
                        <code>{ticket.ticketUUID}</code>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          )}

          {session?.user.role === 'ORGANIZER' && (
            <>
              <section className="panel dashboard-panel">
                <div className="panel-header">
                  <p className="section-tag">Organizer studio</p>
                  <h3 className="panel-title">Launch a new event</h3>
                </div>

                <form className="editor-form" onSubmit={handleCreateEvent}>
                  <div className="editor-grid">
                    <label>
                      <span className="micro-label">Event title</span>
                      <input
                        value={eventForm.title}
                        onChange={(event) => setEventForm((current) => ({ ...current, title: event.target.value }))}
                        placeholder="Design Sprint Demo Day"
                        required
                      />
                    </label>
                    <label>
                      <span className="micro-label">Venue</span>
                      <input
                        value={eventForm.venue}
                        onChange={(event) => setEventForm((current) => ({ ...current, venue: event.target.value }))}
                        placeholder="Innovation Hall"
                        required
                      />
                    </label>
                    <label className="editor-span-2">
                      <span className="micro-label">Description</span>
                      <textarea
                        value={eventForm.description}
                        onChange={(event) => setEventForm((current) => ({ ...current, description: event.target.value }))}
                        placeholder="Describe the audience, experience, and reason to attend."
                        required
                      />
                    </label>
                    <label>
                      <span className="micro-label">Date and time</span>
                      <input
                        value={eventForm.date}
                        onChange={(event) => setEventForm((current) => ({ ...current, date: event.target.value }))}
                        type="datetime-local"
                        required
                      />
                    </label>
                    <label>
                      <span className="micro-label">Max capacity</span>
                      <input
                        value={eventForm.maxCapacity}
                        onChange={(event) =>
                          setEventForm((current) => ({
                            ...current,
                            maxCapacity: Number(event.target.value),
                          }))
                        }
                        type="number"
                        min="1"
                        required
                      />
                    </label>
                  </div>
                  <button className="primary-button" disabled={loading}>
                    Publish event
                  </button>
                </form>
              </section>

              <section className="panel dashboard-panel">
                <div className="panel-header">
                  <p className="section-tag">Operations board</p>
                  <h3 className="panel-title">Manage event lifecycle and registrations</h3>
                </div>

                <div className="organizer-stack">
                  {myEvents.length === 0 ? (
                    <div className="empty-panel">
                      <h4>No organizer events yet</h4>
                      <p>Create your first event above to unlock registration tracking and status controls.</p>
                    </div>
                  ) : (
                    myEvents.map((event) => (
                      <article key={event.id} className="managed-event">
                        <div className="managed-event-header">
                          <div>
                            <span className="section-tag">Managed event</span>
                            <h4>{event.title}</h4>
                            <p>{event.venue}</p>
                          </div>
                          <span className={`status-chip status-${event.status.toLowerCase()}`}>{event.status}</span>
                        </div>

                        <div className="managed-event-stats">
                          <div>
                            <span className="micro-label">Registrations</span>
                            <strong>{event._count?.registrations ?? 0}</strong>
                          </div>
                          <div>
                            <span className="micro-label">Seats left</span>
                            <strong>{getAvailableSeats(event)}</strong>
                          </div>
                          <div>
                            <span className="micro-label">Date</span>
                            <strong>{formatDate(event.date)}</strong>
                          </div>
                        </div>

                        <div className="managed-controls">
                          <label>
                            <span className="micro-label">Status</span>
                            <select
                              value={statusDrafts[event.id] ?? event.status}
                              onChange={(changeEvent) =>
                                setStatusDrafts((current) => ({
                                  ...current,
                                  [event.id]: changeEvent.target.value as EventStatus,
                                }))
                              }
                            >
                              {eventStatusOptions.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                          </label>
                          <button className="ghost-button" onClick={() => void handleStatusUpdate(event.id)}>
                            Save status
                          </button>
                          <button className="ghost-button" onClick={() => void loadRegistrations(event.id)}>
                            View registrations
                          </button>
                        </div>

                        {registrationsByEvent[event.id] && (
                          <div className="registration-sheet">
                            {registrationsByEvent[event.id].length === 0 ? (
                              <p className="empty-state">No registrations for this event yet.</p>
                            ) : (
                              registrationsByEvent[event.id].map((registration) => (
                                <div key={registration.id} className="registration-row">
                                  <div>
                                    <strong>{registration.user.name}</strong>
                                    <span>{registration.user.email}</span>
                                  </div>
                                  <code>{registration.ticketUUID}</code>
                                  <span className="registration-status">
                                    {registration.attended ? 'Attended' : 'Pending'}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </article>
                    ))
                  )}
                </div>
              </section>

              <section className="panel dashboard-panel">
                <div className="panel-header">
                  <p className="section-tag">Entry desk</p>
                  <h3 className="panel-title">Run check-in without leaving the page</h3>
                </div>

                <form className="entry-form" onSubmit={handleCheckIn}>
                  <label>
                    <span className="micro-label">Select event</span>
                    <select
                      value={selectedCheckInEventId}
                      onChange={(event) => setSelectedCheckInEventId(event.target.value)}
                      required
                    >
                      <option value="">Choose event</option>
                      {myEvents.map((event) => (
                        <option key={event.id} value={event.id}>
                          {event.title}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span className="micro-label">Ticket UUID</span>
                    <input
                      value={ticketUUID}
                      onChange={(event) => setTicketUUID(event.target.value)}
                      placeholder="Paste attendee ticket UUID"
                      required
                    />
                  </label>

                  <button className="primary-button" disabled={loading || !selectedCheckInEventId}>
                    Confirm check-in
                  </button>
                </form>
              </section>
            </>
          )}
        </section>

        <aside className="sidebar-column">
          <section className="panel sidebar-panel">
            <div className="panel-header">
              <p className="section-tag">Access</p>
              <h3 className="panel-title">Student and organizer login</h3>
            </div>

            {!session ? (
              <div className="auth-stack">
                <form className="auth-card" onSubmit={handleRegisterSubmit}>
                  <div>
                    <span className="micro-label">New to EventPass?</span>
                    <h4>Create account</h4>
                  </div>
                  <input
                    value={registerForm.name}
                    onChange={(event) => setRegisterForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Full name"
                    required
                  />
                  <input
                    value={registerForm.email}
                    onChange={(event) => setRegisterForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="Email"
                    type="email"
                    required
                  />
                  <input
                    value={registerForm.password}
                    onChange={(event) =>
                      setRegisterForm((current) => ({ ...current, password: event.target.value }))
                    }
                    placeholder="Password"
                    type="password"
                    required
                  />
                  <select
                    value={registerForm.role}
                    onChange={(event) =>
                      setRegisterForm((current) => ({
                        ...current,
                        role: event.target.value as Role,
                      }))
                    }
                  >
                    <option value="STUDENT">Student</option>
                    <option value="ORGANIZER">Organizer</option>
                  </select>
                  <button className="primary-button" disabled={loading}>
                    Create account
                  </button>
                </form>

                <form className="auth-card auth-card-contrast" onSubmit={handleLoginSubmit}>
                  <div>
                    <span className="micro-label">Already registered?</span>
                    <h4>Sign in</h4>
                  </div>
                  <input
                    value={loginForm.email}
                    onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="Email"
                    type="email"
                    required
                  />
                  <input
                    value={loginForm.password}
                    onChange={(event) =>
                      setLoginForm((current) => ({ ...current, password: event.target.value }))
                    }
                    placeholder="Password"
                    type="password"
                    required
                  />
                  <button className="primary-button" disabled={loading}>
                    Login
                  </button>
                </form>
              </div>
            ) : (
              <div className="session-panel">
                <div className="session-avatar">{session.user.name.slice(0, 1).toUpperCase()}</div>
                <div>
                  <span className="micro-label">Active account</span>
                  <h4>{session.user.name}</h4>
                  <p>{session.user.email}</p>
                </div>
                <div className="session-role-chip">{session.user.role}</div>
                <button className="ghost-button" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            )}
          </section>

          <section className="panel sidebar-panel sidebar-panel-dark">
            <div className="panel-header">
              <p className="section-tag">How it feels</p>
              <h3 className="panel-title">A calmer workflow for real event days</h3>
            </div>

            <div className="story-list">
              <article>
                <span className="story-step">01</span>
                <div>
                  <h4>Students discover faster</h4>
                  <p>Search, scan status, and claim a pass without hunting through forms and messages.</p>
                </div>
              </article>
              <article>
                <span className="story-step">02</span>
                <div>
                  <h4>Organizers stay in control</h4>
                  <p>Capacity, registrations, and lifecycle status all live in a single dashboard.</p>
                </div>
              </article>
              <article>
                <span className="story-step">03</span>
                <div>
                  <h4>Check-in stays clean</h4>
                  <p>Ticket UUID verification keeps entry fast and reduces confusion at the gate.</p>
                </div>
              </article>
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}

export default App;
