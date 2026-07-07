import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import NavBar from '../components/NavBar';

const STATUS_META = {
  queued: { label: 'Queued', bg: '#EEEDFE', color: '#3C3489' },
  processing: { label: 'Processing', bg: '#FAEEDA', color: '#633806' },
  retrying: { label: 'Retrying', bg: '#FAEEDA', color: '#633806' },
  delivered: { label: 'Delivered', bg: '#E1F5EE', color: '#085041' },
  dead: { label: 'Dead letter', bg: '#FCEBEB', color: '#A32D2D' }
};

const CHANNEL_META = {
  in_app: 'In-app',
  email: 'Email'
};

const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const upsertJob = (jobs, updatedJob) => {
  if (!updatedJob?._id) return jobs;
  const exists = jobs.some(job => job._id === updatedJob._id);
  if (!exists) return [updatedJob, ...jobs].slice(0, 25);
  return jobs.map(job => (job._id === updatedJob._id ? { ...job, ...updatedJob } : job));
};

export default function NotificationDashboard() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState({
    queueMode: 'mongo',
    summary: { byStatus: {}, byChannel: {} },
    recentJobs: [],
    deadLetterJobs: []
  });
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState('');
  const [error, setError] = useState('');
  const [live, setLive] = useState(false);

  const loadDashboard = async () => {
    setError('');
    try {
      const res = await api.get('/notifications/delivery-dashboard');
      setDashboard(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load notification dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    const onUpdate = (event) => {
      const job = event.detail?.job;
      if (!job?._id) return;
      setLive(true);
      setDashboard(prev => ({
        ...prev,
        recentJobs: upsertJob(prev.recentJobs || [], job),
        deadLetterJobs: job.status === 'dead'
          ? upsertJob(prev.deadLetterJobs || [], job)
          : (prev.deadLetterJobs || []).filter(item => item._id !== job._id)
      }));
      window.setTimeout(() => setLive(false), 1200);
      loadDashboard();
    };

    window.addEventListener('sportmate:notification-job-update', onUpdate);
    return () => window.removeEventListener('sportmate:notification-job-update', onUpdate);
  }, []);

  const totals = useMemo(() => {
    const byStatus = dashboard.summary?.byStatus || {};
    return {
      total: Object.values(byStatus).reduce((sum, count) => sum + count, 0),
      active: (byStatus.queued || 0) + (byStatus.processing || 0) + (byStatus.retrying || 0),
      failed: byStatus.dead || 0,
      delivered: byStatus.delivered || 0
    };
  }, [dashboard.summary]);

  const retryJob = async (jobId) => {
    setRetryingId(jobId);
    setError('');
    try {
      await api.put(`/notifications/jobs/${jobId}/retry`);
      await loadDashboard();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not retry notification job');
    } finally {
      setRetryingId('');
    }
  };

  const statusChip = (status) => {
    const meta = STATUS_META[status] || STATUS_META.queued;
    return (
      <span style={{
        background: meta.bg,
        color: meta.color,
        padding: '4px 9px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 800,
        whiteSpace: 'nowrap'
      }}>
        {meta.label}
      </span>
    );
  };

  const metricCard = (label, value, detail) => (
    <div style={{
      background: 'var(--bg2)',
      borderRadius: 14,
      padding: 14,
      minHeight: 82
    }}>
      <div style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontFamily: 'Syne,sans-serif', fontSize: 24, fontWeight: 800, marginTop: 6 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{detail}</div>
    </div>
  );

  const jobRow = (job) => (
    <div
      key={job._id}
      style={{
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: 12,
        marginBottom: 10
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'Syne,sans-serif', fontSize: 14, fontWeight: 800, textTransform: 'capitalize' }}>
            {job.type?.replaceAll('_', ' ')}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 3 }}>
            {CHANNEL_META[job.channel] || job.channel} delivery
          </div>
        </div>
        {statusChip(job.status)}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
        <span className="chip chip-green">Attempts {job.attempts || 0}/{job.maxAttempts || 5}</span>
        <span className="chip chip-amber">Created {formatDate(job.createdAt)}</span>
        {job.nextAttemptAt && job.status !== 'delivered' && (
          <span className="chip chip-purple">Next {formatDate(job.nextAttemptAt)}</span>
        )}
      </div>

      {(job.lastError || job.deadLetterReason) && (
        <div style={{
          background: '#FCEBEB',
          color: '#A32D2D',
          borderRadius: 10,
          padding: '8px 10px',
          fontSize: 12,
          marginTop: 10,
          lineHeight: 1.45
        }}>
          {job.deadLetterReason || job.lastError}
        </div>
      )}

      {['dead', 'retrying'].includes(job.status) && (
        <button
          className="btn btn-outline btn-sm"
          style={{ marginTop: 10 }}
          disabled={retryingId === job._id}
          onClick={() => retryJob(job._id)}
        >
          {retryingId === job._id ? 'Retrying...' : 'Retry delivery'}
        </button>
      )}
    </div>
  );

  return (
    <div className="app-shell">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>Back</button>
        <h1>Notification Health</h1>
        <p>Realtime queue status, retries and dead letters</p>
      </div>

      <div className="scroll-content">
        {error && (
          <div style={{ background: '#FCEBEB', color: '#A32D2D', padding: '10px 14px', borderRadius: 10, marginBottom: 14, fontSize: 13 }}>
            {error}
          </div>
        )}

        {loading && <div className="loading"><div className="spinner"></div></div>}

        {!loading && (
          <>
            <div style={{
              background: live ? 'var(--green-light)' : 'var(--bg2)',
              borderRadius: 14,
              padding: '12px 14px',
              marginBottom: 12,
              display: 'flex',
              justifyContent: 'space-between',
              gap: 10,
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>Worker mode</div>
                <div style={{ fontFamily: 'Syne,sans-serif', fontSize: 16, fontWeight: 800 }}>
                  {dashboard.queueMode === 'bullmq-ready' ? 'BullMQ / Redis ready' : 'Mongo durable queue'}
                </div>
              </div>
              <span className={live ? 'chip chip-green' : 'chip chip-purple'}>
                {live ? 'Live update' : 'Realtime'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {metricCard('Delivered', totals.delivered, 'successful jobs')}
              {metricCard('Active', totals.active, 'queued or retrying')}
              {metricCard('Dead letters', totals.failed, 'need attention')}
              {metricCard('Total', totals.total, 'tracked jobs')}
            </div>

            <div className="section-label">Delivery channels</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              <span className="chip chip-green">In-app {dashboard.summary?.byChannel?.in_app || 0}</span>
              <span className="chip chip-amber">Email {dashboard.summary?.byChannel?.email || 0}</span>
            </div>

            {dashboard.deadLetterJobs?.length > 0 && (
              <>
                <div className="section-label">Dead letter queue</div>
                {dashboard.deadLetterJobs.map(jobRow)}
              </>
            )}

            <div className="section-label">Recent jobs</div>
            {dashboard.recentJobs?.length === 0 ? (
              <div className="empty-state">
                <p style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 16 }}>No jobs yet</p>
                <p style={{ fontSize: 13, marginTop: 8 }}>Send a match request to see delivery jobs here.</p>
              </div>
            ) : (
              dashboard.recentJobs.map(jobRow)
            )}
          </>
        )}
      </div>

      <NavBar />
    </div>
  );
}
