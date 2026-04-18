import { useDeferredValue, useEffect, useState, useCallback } from 'react';
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

type Page = 'events' | 'tickets' | 'organizer' | 'checkin';

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

/* ===== HELPER: Format date nicely ===== */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* ===== HELPER: Get initials ===== */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/* ===== HELPER: Seat status ===== */
function getSeatStatus(available: number, max: number) {
  const ratio = available / max;
  if (ratio <= 0) return { class: 'full', label: 'Full' };
  if (ratio <= 0.2) return { class: 'limited', label: `${available} left` };
  return { class: 'available', label: `${available} left` };
}

function App() {
  /* ---- State ---- */
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
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState<Page>('events');
  const [session, setSession] = useState<SessionState | null>(() => {
    const stored = localStorage.getItem('eventpass-session');
    return stored ? (JSON.parse(stored) as SessionState) : null;
  });

  const deferredSearch = useDeferredValue(search);

  /* ---- Toast helper ---- */
  const showToast = useCallback((message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 4000);
  }, []);

  /* ---- API helper ---- */
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

  /* ---- Data loaders ---- */
  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const token = session?.token;
      const data = await apiRequest<EventRecord[]>('/events', {}, token);
      setEvents(data);
    } catch (error) {
      showToast((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [session?.token, showToast]);

  const loadTickets = useCallback(
    async (token: string) => {
      try {
        const data = await apiRequest<TicketRecord[]>('/registrations/my-tickets', {}, token);
        setTickets(data);
      } catch (error) {
        showToast((error as Error).message);
      }
    },
    [showToast]
  );

  const loadMyEvents = useCallback(
    async (token: string) => {
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
        showToast((error as Error).message);
      }
    },
    [selectedCheckInEventId, showToast]
  );

  const loadRegistrations = useCallback(
    async (eventId: string) => {
      if (!session) return;
      try {
        const data = await apiRequest<EventRegistration[]>(`/events/${eventId}/registrations`, {}, session.token);
        setRegistrationsByEvent((current) => ({ ...current, [eventId]: data }));
      } catch (error) {
        showToast((error as Error).message);
      }
    },
    [session, showToast]
  );

  /* ---- Effects ---- */
  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (!session) return;
    if (session.user.role === 'STUDENT') void loadTickets(session.token);
    if (session.user.role === 'ORGANIZER') void loadMyEvents(session.token);
  }, [session, loadTickets, loadMyEvents]);

  /* ---- Handlers ---- */
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
      showToast(`Welcome, ${data.user.name}! Account created successfully.`);
      await loadEvents();
    } catch (error) {
      showToast((error as Error).message);
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
      showToast(`Welcome back, ${data.user.name}!`);
      await loadEvents();
    } catch (error) {
      showToast((error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterForEvent(eventId: string) {
    if (!session) {
      showToast('Please sign in as a student to register.');
      return;
    }
    try {
      setLoading(true);
      await apiRequest('/registrations/register', { method: 'POST', body: JSON.stringify({ eventId }) }, session.token);
      showToast('🎉 Registered! Check your tickets for the digital pass.');
      await Promise.all([loadEvents(), loadTickets(session.token)]);
    } catch (error) {
      showToast((error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
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
      showToast('✅ Event created successfully!');
      await Promise.all([loadEvents(), loadMyEvents(session.token)]);
    } catch (error) {
      showToast((error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusUpdate(eventId: string) {
    if (!session) return;
    try {
      setLoading(true);
      await apiRequest(
        `/events/${eventId}/status`,
        { method: 'PATCH', body: JSON.stringify({ status: statusDrafts[eventId] }) },
        session.token
      );
      showToast('Event status updated.');
      await Promise.all([loadEvents(), loadMyEvents(session.token)]);
    } catch (error) {
      showToast((error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !selectedCheckInEventId) return;
    try {
      setLoading(true);
      await apiRequest(
        '/registrations/check-in',
        { method: 'POST', body: JSON.stringify({ eventId: selectedCheckInEventId, ticketUUID }) },
        session.token
      );
      setTicketUUID('');
      showToast('✅ Check-in successful!');
      await loadRegistrations(selectedCheckInEventId);
    } catch (error) {
      showToast((error as Error).message);
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
    setPage('events');
    showToast('Signed out successfully.');
  }

  /* ---- Filtered events ---- */
  const filteredEvents = events.filter((event) => {
    const query = deferredSearch.trim().toLowerCase();
    if (!query) return true;
    return [event.title, event.venue, event.description].join(' ').toLowerCase().includes(query);
  });

  /* ---- Navigation tabs ---- */
  const navTabs: { id: Page; label: string; icon: string; show: boolean }[] = [
    { id: 'events', label: 'Events', icon: '🎪', show: true },
    { id: 'tickets', label: 'My Tickets', icon: '🎫', show: session?.user.role === 'STUDENT' },
    { id: 'organizer', label: 'Dashboard', icon: '⚙️', show: session?.user.role === 'ORGANIZER' },
    { id: 'checkin', label: 'Check-In', icon: '✅', show: session?.user.role === 'ORGANIZER' },
  ];

  const visibleTabs = navTabs.filter((t) => t.show);

  /* ============================== RENDER ============================== */
  return (
    <div className="app-shell">
      {/* Loading bar */}
      {loading && <div className="loading-bar" />}

      {/* ---- NAVBAR ---- */}
      <nav className="navbar" id="main-nav">
        <div className="navbar-brand">
          <span className="logo-icon">🎫</span>
          <span className="brand-text">EventPass</span>
        </div>

        <div className="navbar-nav">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              id={`nav-${tab.id}`}
              className={`nav-tab ${page === tab.id ? 'active' : ''}`}
              onClick={() => setPage(tab.id)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="navbar-actions">
          {session ? (
            <>
              <div className="user-badge">
                <div className="user-avatar">{getInitials(session.user.name)}</div>
                <div className="user-info">
                  <span className="user-name">{session.user.name}</span>
                  <span className="user-role">{session.user.role}</span>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" id="logout-btn" onClick={handleLogout}>
                Sign out
              </button>
            </>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => setPage('events')}>
              Get Started
            </button>
          )}
        </div>
      </nav>

      {/* Mobile nav */}
      <div className="mobile-nav">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            className={`nav-tab ${page === tab.id ? 'active' : ''}`}
            onClick={() => setPage(tab.id)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ---- MAIN CONTENT ---- */}
      <main className="page-content">
        {/* === EVENTS PAGE === */}
        {page === 'events' && (
          <>
            {/* Hero */}
            <section className="hero" id="hero-section">
              <div className="hero-eyebrow">🎓 College Event Ticketing Platform</div>
              <h1>
                Discover events.
                <br />
                <span className="gradient-text">Register instantly.</span>
              </h1>
              <p className="hero-description">
                Browse upcoming college events, register with a single click, and receive a secure UUID-based digital
                pass. Organizers can create events, manage capacity, and verify entry in real-time.
              </p>
              <div className="hero-stats">
                <div className="hero-stat">
                  <span className="hero-stat-value">{events.length}</span>
                  <span className="hero-stat-label">Total Events</span>
                </div>
                <div className="hero-stat">
                  <span className="hero-stat-value">{events.filter((e) => e.status === 'UPCOMING').length}</span>
                  <span className="hero-stat-label">Upcoming</span>
                </div>
                {session?.user.role === 'STUDENT' && (
                  <div className="hero-stat">
                    <span className="hero-stat-value">{tickets.length}</span>
                    <span className="hero-stat-label">My Tickets</span>
                  </div>
                )}
                {session?.user.role === 'ORGANIZER' && (
                  <div className="hero-stat">
                    <span className="hero-stat-value">{myEvents.length}</span>
                    <span className="hero-stat-label">My Events</span>
                  </div>
                )}
              </div>
            </section>

            {/* Auth section (guest only) */}
            {!session && (
              <section className="auth-section" id="auth-section">
                <div className="section-header">
                  <div>
                    <h2>
                      <span className="section-icon">🔐</span> Get Started
                    </h2>
                    <p className="section-subtitle">Create an account or sign in to register for events</p>
                  </div>
                </div>

                <div className="auth-container">
                  {/* Register */}
                  <div className="auth-card" id="register-card">
                    <h3>Create Account</h3>
                    <p className="auth-subtitle">New here? Sign up in seconds.</p>
                    <form className="form-stack" onSubmit={handleRegisterSubmit} id="register-form">
                      <div className="form-group">
                        <label className="form-label">Full Name</label>
                        <input
                          className="form-input"
                          id="register-name"
                          value={registerForm.name}
                          onChange={(e) => setRegisterForm((c) => ({ ...c, name: e.target.value }))}
                          placeholder="e.g. Aarav Sharma"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                          className="form-input"
                          id="register-email"
                          value={registerForm.email}
                          onChange={(e) => setRegisterForm((c) => ({ ...c, email: e.target.value }))}
                          placeholder="you@college.edu"
                          type="email"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                          className="form-input"
                          id="register-password"
                          value={registerForm.password}
                          onChange={(e) => setRegisterForm((c) => ({ ...c, password: e.target.value }))}
                          placeholder="Min 6 characters"
                          type="password"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Role</label>
                        <select
                          className="form-select"
                          id="register-role"
                          value={registerForm.role}
                          onChange={(e) => setRegisterForm((c) => ({ ...c, role: e.target.value as Role }))}
                        >
                          <option value="STUDENT">Student</option>
                          <option value="ORGANIZER">Organizer</option>
                        </select>
                      </div>
                      <button className="btn btn-primary btn-full" id="register-submit" disabled={loading}>
                        Create Account
                      </button>
                    </form>
                  </div>

                  {/* Login */}
                  <div className="auth-card" id="login-card">
                    <h3>Welcome Back</h3>
                    <p className="auth-subtitle">Sign in to your account.</p>
                    <form className="form-stack" onSubmit={handleLoginSubmit} id="login-form">
                      <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                          className="form-input"
                          id="login-email"
                          value={loginForm.email}
                          onChange={(e) => setLoginForm((c) => ({ ...c, email: e.target.value }))}
                          placeholder="you@college.edu"
                          type="email"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                          className="form-input"
                          id="login-password"
                          value={loginForm.password}
                          onChange={(e) => setLoginForm((c) => ({ ...c, password: e.target.value }))}
                          placeholder="Enter your password"
                          type="password"
                          required
                        />
                      </div>
                      <button className="btn btn-primary btn-full" id="login-submit" disabled={loading}>
                        Sign In
                      </button>
                    </form>
                  </div>
                </div>
              </section>
            )}

            {/* Signed-in session display */}
            {session && (
              <section className="auth-section">
                <div className="session-display" id="session-card">
                  <div className="session-info">
                    <div className="session-avatar">{getInitials(session.user.name)}</div>
                    <div className="session-details">
                      <h3>{session.user.name}</h3>
                      <p>{session.user.email}</p>
                    </div>
                    <span className="session-role-badge">{session.user.role}</span>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                    Sign Out
                  </button>
                </div>
              </section>
            )}

            {/* Event Feed */}
            <section className="events-section" id="events-section">
              <div className="section-header">
                <div>
                  <h2>
                    <span className="section-icon">🎪</span> Event Feed
                  </h2>
                  <p className="section-subtitle">Browse open events and register with one click</p>
                </div>
                <div className="search-bar">
                  <span className="search-icon">🔍</span>
                  <input
                    className="form-input"
                    id="search-events"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search events..."
                  />
                </div>
              </div>

              {filteredEvents.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🎭</div>
                  <h4>No events found</h4>
                  <p>Try adjusting your search or check back later for new events.</p>
                </div>
              ) : (
                <div className="event-grid">
                  {filteredEvents.map((event, i) => {
                    const available = event.availableSeats ?? Math.max(event.maxCapacity - (event._count?.registrations ?? 0), 0);
                    const seatInfo = getSeatStatus(available, event.maxCapacity);
                    return (
                      <article
                        key={event.id}
                        className="event-card"
                        id={`event-${event.id}`}
                        style={{ animationDelay: `${i * 60}ms` }}
                      >
                        <div className="event-card-header">
                          <span className={`status-pill status-${event.status.toLowerCase()}`}>{event.status}</span>
                          <div className="seats-indicator">
                            <span className={`seats-dot ${seatInfo.class}`} />
                            <span>{seatInfo.label}</span>
                          </div>
                        </div>
                        <h3>{event.title}</h3>
                        <p className="event-desc">{event.description}</p>
                        <div className="event-meta-grid">
                          <div className="event-meta-item">
                            <span className="meta-label">📅 Date</span>
                            <span className="meta-value">{formatDate(event.date)}</span>
                          </div>
                          <div className="event-meta-item">
                            <span className="meta-label">📍 Venue</span>
                            <span className="meta-value">{event.venue}</span>
                          </div>
                          <div className="event-meta-item">
                            <span className="meta-label">👥 Capacity</span>
                            <span className="meta-value">{event.maxCapacity}</span>
                          </div>
                        </div>
                        <button
                          className="btn btn-primary btn-full"
                          disabled={
                            loading ||
                            session?.user.role !== 'STUDENT' ||
                            event.status !== 'UPCOMING' ||
                            Boolean(event.isFull)
                          }
                          onClick={() => void handleRegisterForEvent(event.id)}
                        >
                          {!session
                            ? 'Sign in to register'
                            : session.user.role !== 'STUDENT'
                              ? 'Students only'
                              : event.isFull
                                ? 'Fully Booked'
                                : event.status !== 'UPCOMING'
                                  ? 'Registration closed'
                                  : 'Register Now'}
                        </button>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}

        {/* === MY TICKETS PAGE (Student) === */}
        {page === 'tickets' && session?.user.role === 'STUDENT' && (
          <section className="tickets-section" id="tickets-section">
            <div className="section-header">
              <div>
                <h2>
                  <span className="section-icon">🎫</span> My Tickets
                </h2>
                <p className="section-subtitle">Your registered events and secure digital passes</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => void loadTickets(session.token)}>
                ↻ Refresh
              </button>
            </div>

            {tickets.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🎟️</div>
                <h4>No tickets yet</h4>
                <p>Register for an upcoming event to get your digital pass.</p>
              </div>
            ) : (
              <div className="ticket-grid">
                {tickets.map((ticket) => (
                  <article key={ticket.id} className="ticket-card" id={`ticket-${ticket.id}`}>
                    <div className="ticket-event-info">
                      <h4>{ticket.event.title}</h4>
                      <p>
                        📍 {ticket.event.venue} • 📅 {formatDate(ticket.event.date)}
                      </p>
                    </div>
                    <div className="ticket-uuid">
                      <span className="uuid-label">Ticket UUID</span>
                      <code>{ticket.ticketUUID}</code>
                    </div>
                    <span className={`ticket-status ${ticket.attended ? 'checked-in' : 'active'}`}>
                      {ticket.attended ? '✅ Checked In' : '🟢 Active'}
                    </span>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* === ORGANIZER DASHBOARD === */}
        {page === 'organizer' && session?.user.role === 'ORGANIZER' && (
          <section className="organizer-section" id="organizer-section">
            {/* Create Event Form */}
            <div className="section-header">
              <div>
                <h2>
                  <span className="section-icon">➕</span> Create Event
                </h2>
                <p className="section-subtitle">Set up a new event with capacity management</p>
              </div>
            </div>

            <div className="create-event-form">
              <div className="auth-card">
                <form className="form-stack" onSubmit={handleCreateEvent} id="create-event-form">
                  <div className="form-group">
                    <label className="form-label">Event Title</label>
                    <input
                      className="form-input"
                      id="event-title"
                      value={eventForm.title}
                      onChange={(e) => setEventForm((c) => ({ ...c, title: e.target.value }))}
                      placeholder="e.g. Hackathon 2026"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-textarea"
                      id="event-description"
                      value={eventForm.description}
                      onChange={(e) => setEventForm((c) => ({ ...c, description: e.target.value }))}
                      placeholder="What's this event about?"
                      required
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Date & Time</label>
                      <input
                        className="form-input"
                        id="event-date"
                        value={eventForm.date}
                        onChange={(e) => setEventForm((c) => ({ ...c, date: e.target.value }))}
                        type="datetime-local"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Venue</label>
                      <input
                        className="form-input"
                        id="event-venue"
                        value={eventForm.venue}
                        onChange={(e) => setEventForm((c) => ({ ...c, venue: e.target.value }))}
                        placeholder="e.g. Main Auditorium"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Max Capacity</label>
                      <input
                        className="form-input"
                        id="event-capacity"
                        value={eventForm.maxCapacity}
                        onChange={(e) => setEventForm((c) => ({ ...c, maxCapacity: Number(e.target.value) }))}
                        type="number"
                        min="1"
                        required
                      />
                    </div>
                  </div>
                  <button className="btn btn-primary" id="create-event-submit" disabled={loading}>
                    ✨ Create Event
                  </button>
                </form>
              </div>
            </div>

            {/* Managed Events */}
            <div className="section-header">
              <div>
                <h2>
                  <span className="section-icon">📋</span> Managed Events
                </h2>
                <p className="section-subtitle">View registrations and update event status</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => void loadMyEvents(session.token)}>
                ↻ Refresh
              </button>
            </div>

            {myEvents.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <h4>No events created yet</h4>
                <p>Use the form above to create your first event.</p>
              </div>
            ) : (
              <div className="managed-events-list">
                {myEvents.map((event) => (
                  <article key={event.id} className="managed-event-card" id={`managed-${event.id}`}>
                    <div className="managed-event-top">
                      <div className="managed-event-info">
                        <h4>{event.title}</h4>
                        <p>📍 {event.venue} • 📅 {formatDate(event.date)}</p>
                        <div className="managed-event-stats">
                          <div className="managed-stat">
                            <span className="stat-value">{event._count?.registrations ?? 0}</span>
                            <span className="stat-label">Registered</span>
                          </div>
                          <div className="managed-stat">
                            <span className="stat-value">{event.availableSeats ?? 0}</span>
                            <span className="stat-label">Seats Left</span>
                          </div>
                          <div className="managed-stat">
                            <span className="stat-value">{event.maxCapacity}</span>
                            <span className="stat-label">Capacity</span>
                          </div>
                        </div>
                      </div>
                      <span className={`status-pill status-${event.status.toLowerCase()}`}>{event.status}</span>
                    </div>

                    <div className="managed-event-actions">
                      <select
                        value={statusDrafts[event.id] ?? event.status}
                        onChange={(e) =>
                          setStatusDrafts((c) => ({ ...c, [event.id]: e.target.value as EventStatus }))
                        }
                      >
                        {eventStatusOptions.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <button className="btn btn-ghost btn-sm" onClick={() => void handleStatusUpdate(event.id)}>
                        Save Status
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => void loadRegistrations(event.id)}>
                        View Registrations
                      </button>
                    </div>

                    {registrationsByEvent[event.id] && (
                      <div className="registrations-panel">
                        {registrationsByEvent[event.id].length === 0 ? (
                          <div className="empty-state" style={{ padding: '24px' }}>
                            <p>No registrations yet for this event.</p>
                          </div>
                        ) : (
                          registrationsByEvent[event.id].map((reg) => (
                            <div key={reg.id} className="registration-row">
                              <div className="reg-user">
                                <strong>{reg.user.name}</strong>
                                <span>{reg.user.email}</span>
                              </div>
                              <code>{reg.ticketUUID}</code>
                              <span className={`reg-status ${reg.attended ? 'attended' : 'pending'}`}>
                                {reg.attended ? '✅ Attended' : '⏳ Pending'}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* === CHECK-IN PAGE (Organizer) === */}
        {page === 'checkin' && session?.user.role === 'ORGANIZER' && (
          <section className="checkin-section" id="checkin-section">
            <div className="section-header">
              <div>
                <h2>
                  <span className="section-icon">✅</span> Check-In Portal
                </h2>
                <p className="section-subtitle">Verify and validate ticket entry using UUID</p>
              </div>
            </div>

            <div className="checkin-card">
              <h3>Verify Attendee</h3>
              <p className="checkin-subtitle">
                Select an event and paste the student's ticket UUID to mark them as attended.
              </p>
              <form className="form-stack" onSubmit={handleCheckIn} id="checkin-form">
                <div className="form-group">
                  <label className="form-label">Select Event</label>
                  <select
                    className="form-select"
                    id="checkin-event"
                    value={selectedCheckInEventId}
                    onChange={(e) => setSelectedCheckInEventId(e.target.value)}
                    required
                  >
                    <option value="">Choose an event...</option>
                    {myEvents.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Ticket UUID</label>
                  <input
                    className="form-input"
                    id="checkin-uuid"
                    value={ticketUUID}
                    onChange={(e) => setTicketUUID(e.target.value)}
                    placeholder="Paste the ticket UUID here"
                    required
                  />
                </div>
                <button
                  className="btn btn-success btn-full"
                  id="checkin-submit"
                  disabled={loading || !selectedCheckInEventId}
                >
                  ✅ Check In Attendee
                </button>
              </form>
            </div>
          </section>
        )}
      </main>

      {/* ---- TOAST ---- */}
      {toast.visible && (
        <div className="toast" id="toast-message">
          <span className="toast-icon">💬</span>
          <span>{toast.message}</span>
          <button className="toast-close" onClick={() => setToast((t) => ({ ...t, visible: false }))}>
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
