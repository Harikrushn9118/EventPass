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
            Object.fromEntries(
              data.map((event) => [event.id, event.status])
            ) as Record<string, EventStatus>
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
        Object.fromEntries(
          data.map((event) => [event.id, event.status])
        ) as Record<string, EventStatus>
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
      const data = await apiRequest<EventRegistration[]>(
        `/events/${eventId}/registrations`,
        {},
        session.token
      );
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
      const data = await apiRequest<SessionState>(
        '/auth/register',
        {
          method: 'POST',
          body: JSON.stringify(registerForm),
        }
      );

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
      const data = await apiRequest<SessionState>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify(loginForm),
        }
      );

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

    return [event.title, event.venue, event.description]
      .join(' ')
      .toLowerCase()
      .includes(query);
  });

  return (
    <div className="page-shell">
      <header className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">College Event Ticketing Platform</p>
          <h1>EventPass turns event chaos into a clean registration and check-in flow.</h1>
          <p className="hero-text">
            Students can discover events and keep their digital passes in one place.
            Organizers can create events, monitor seat capacity, and validate entry using secure UUID tickets.
          </p>
          <div className="hero-badges">
            <span>JWT Auth</span>
            <span>Capacity Guard</span>
            <span>Organizer Check-In</span>
            <span>React + Express + Prisma</span>
          </div>
        </div>
        <aside className="hero-summary">
          <div className="summary-card">
            <strong>{events.length}</strong>
            <span>Visible events</span>
          </div>
          <div className="summary-card">
            <strong>{tickets.length}</strong>
            <span>My tickets</span>
          </div>
          <div className="summary-card">
            <strong>{myEvents.length}</strong>
            <span>Managed events</span>
          </div>
        </aside>
      </header>

      <section className="status-strip">
        <div>
          <span className="status-label">API</span>
          <code>{API_BASE_URL}</code>
        </div>
        <div>
          <span className="status-label">Session</span>
          <strong>{session ? `${session.user.name} (${session.user.role})` : 'Guest mode'}</strong>
        </div>
        <button className="ghost-button" onClick={() => void loadEvents()} disabled={loading}>
          Refresh events
        </button>
      </section>

      <section className="message-banner">
        <span className={loading ? 'pulse-dot active' : 'pulse-dot'}></span>
        <p>{message}</p>
      </section>

      <main className="content-grid">
        <section className="panel auth-panel">
          <div className="panel-heading">
            <p className="eyebrow">Authentication</p>
            <h2>Access the student and organizer dashboards</h2>
          </div>

          {!session ? (
            <div className="auth-grid">
              <form className="stack-form" onSubmit={handleRegisterSubmit}>
                <h3>Create account</h3>
                <input
                  value={registerForm.name}
                  onChange={(event) =>
                    setRegisterForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Full name"
                  required
                />
                <input
                  value={registerForm.email}
                  onChange={(event) =>
                    setRegisterForm((current) => ({ ...current, email: event.target.value }))
                  }
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

              <form className="stack-form" onSubmit={handleLoginSubmit}>
                <h3>Login</h3>
                <input
                  value={loginForm.email}
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, email: event.target.value }))
                  }
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
                  Sign in
                </button>
              </form>
            </div>
          ) : (
            <div className="session-card">
              <div>
                <p className="eyebrow">Signed in</p>
                <h3>{session.user.name}</h3>
                <p>{session.user.email}</p>
              </div>
              <div className="session-role">{session.user.role}</div>
              <button className="ghost-button" onClick={handleLogout}>
                Logout
              </button>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-heading row-between">
            <div>
              <p className="eyebrow">Event Feed</p>
              <h2>Browse open events and remaining seats</h2>
            </div>
            <input
              className="search-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by title or venue"
            />
          </div>

          <div className="event-grid">
            {filteredEvents.map((event) => (
              <article key={event.id} className="event-card">
                <div className="event-topline">
                  <span className={`status-pill status-${event.status.toLowerCase()}`}>{event.status}</span>
                  <span>{event.availableSeats ?? Math.max(event.maxCapacity - (event._count?.registrations ?? 0), 0)} seats left</span>
                </div>
                <h3>{event.title}</h3>
                <p>{event.description}</p>
                <dl className="event-meta">
                  <div>
                    <dt>Date</dt>
                    <dd>{new Date(event.date).toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt>Venue</dt>
                    <dd>{event.venue}</dd>
                  </div>
                  <div>
                    <dt>Capacity</dt>
                    <dd>{event.maxCapacity}</dd>
                  </div>
                </dl>
                <button
                  className="primary-button"
                  disabled={
                    loading ||
                    session?.user.role !== 'STUDENT' ||
                    event.status !== 'UPCOMING' ||
                    Boolean(event.isFull)
                  }
                  onClick={() => void handleRegisterForEvent(event.id)}
                >
                  {session?.user.role === 'STUDENT' ? 'Register for event' : 'Login as student to register'}
                </button>
              </article>
            ))}
          </div>
        </section>

        {session?.user.role === 'STUDENT' && (
          <section className="panel">
            <div className="panel-heading">
              <p className="eyebrow">Student Dashboard</p>
              <h2>View your secure tickets</h2>
            </div>
            <div className="ticket-list">
              {tickets.length === 0 ? (
                <p className="empty-state">No tickets yet. Register for an upcoming event to generate one.</p>
              ) : (
                tickets.map((ticket) => (
                  <article key={ticket.id} className="ticket-card">
                    <div>
                      <h3>{ticket.event.title}</h3>
                      <p>{ticket.event.venue}</p>
                    </div>
                    <div className="ticket-code">
                      <span>Ticket UUID</span>
                      <code>{ticket.ticketUUID}</code>
                    </div>
                    <div className="ticket-state">{ticket.attended ? 'Checked in' : 'Active'}</div>
                  </article>
                ))
              )}
            </div>
          </section>
        )}

        {session?.user.role === 'ORGANIZER' && (
          <>
            <section className="panel">
              <div className="panel-heading">
                <p className="eyebrow">Organizer Dashboard</p>
                <h2>Create events and manage lifecycle status</h2>
              </div>

              <form className="stack-form compact-form" onSubmit={handleCreateEvent}>
                <input
                  value={eventForm.title}
                  onChange={(event) => setEventForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Event title"
                  required
                />
                <textarea
                  value={eventForm.description}
                  onChange={(event) =>
                    setEventForm((current) => ({ ...current, description: event.target.value }))
                  }
                  placeholder="Description"
                  required
                />
                <div className="inline-fields">
                  <input
                    value={eventForm.date}
                    onChange={(event) => setEventForm((current) => ({ ...current, date: event.target.value }))}
                    type="datetime-local"
                    required
                  />
                  <input
                    value={eventForm.venue}
                    onChange={(event) => setEventForm((current) => ({ ...current, venue: event.target.value }))}
                    placeholder="Venue"
                    required
                  />
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
                    placeholder="Capacity"
                    required
                  />
                </div>
                <button className="primary-button" disabled={loading}>
                  Create event
                </button>
              </form>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <p className="eyebrow">Managed Events</p>
                <h2>Review registrations and update status</h2>
              </div>

              <div className="organizer-event-list">
                {myEvents.map((event) => (
                  <article key={event.id} className="managed-event">
                    <div className="managed-copy">
                      <h3>{event.title}</h3>
                      <p>{event.venue}</p>
                      <span>
                        {(event._count?.registrations ?? 0)} registrations • {event.availableSeats ?? 0} seats left
                      </span>
                    </div>
                    <div className="managed-actions">
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
                      <button className="ghost-button" onClick={() => void handleStatusUpdate(event.id)}>
                        Save status
                      </button>
                      <button className="ghost-button" onClick={() => void loadRegistrations(event.id)}>
                        Load registrations
                      </button>
                    </div>

                    {registrationsByEvent[event.id] && (
                      <div className="registration-list">
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
                              <span>{registration.attended ? 'Attended' : 'Pending'}</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <p className="eyebrow">Check-In Portal</p>
                <h2>Verify entry using the ticket UUID</h2>
              </div>

              <form className="stack-form compact-form" onSubmit={handleCheckIn}>
                <select
                  value={selectedCheckInEventId}
                  onChange={(event) => setSelectedCheckInEventId(event.target.value)}
                  required
                >
                  <option value="">Select event</option>
                  {myEvents.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.title}
                    </option>
                  ))}
                </select>
                <input
                  value={ticketUUID}
                  onChange={(event) => setTicketUUID(event.target.value)}
                  placeholder="Paste ticket UUID"
                  required
                />
                <button className="primary-button" disabled={loading || !selectedCheckInEventId}>
                  Check in attendee
                </button>
              </form>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
