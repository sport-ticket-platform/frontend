import { useEffect, useState } from 'react';
import { adminService } from '../services/adminService.js';

const initialMatch = { leagueId: '', venueId: '', matchTime: '', hostTeamId: '', guestTeamId: '' };
const initialConfig = {
  matchId: '', categoryId: '', price: '', amenities: '', section: 1, rowStart: 1, rowCount: 1, seatsPerRow: 1,
};

export default function AdminToolsPage() {
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState('');
  const [match, setMatch] = useState(initialMatch);
  const [config, setConfig] = useState(initialConfig);
  const [message, setMessage] = useState(null);

  const loadUsers = async () => {
    try {
      setUsers(await adminService.getUsers({ email, status: '' }));
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  useEffect(() => { loadUsers(); }, []); 
  const toggleUser = async (user) => {
    try {
      await adminService.changeUserStatus(user.userId, !user.isActive);
      setUsers((current) => current.map((item) => (
        item.userId === user.userId ? { ...item, isActive: !item.isActive } : item
      )));
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const submitMatch = async (event) => {
    event.preventDefault();
    try {
      const id = await adminService.createMatch({
        ...match,
        leagueId: Number(match.leagueId), venueId: Number(match.venueId),
        hostTeamId: Number(match.hostTeamId), guestTeamId: Number(match.guestTeamId),
        matchTime: new Date(match.matchTime).toISOString(),
      });
      setMessage({ type: 'info', text: `مسابقه با شناسه ${id} ایجاد شد.` });
      setMatch(initialMatch);
    } catch (error) { setMessage({ type: 'error', text: error.message }); }
  };

  const submitConfig = async (event) => {
    event.preventDefault();
    try {
      const id = await adminService.createTicketConfig({
        matchId: Number(config.matchId), categoryId: Number(config.categoryId),
        price: Number(config.price), amenities: config.amenities || null,
        seatBlocks: [{
          section: Number(config.section), rowStart: Number(config.rowStart),
          rowCount: Number(config.rowCount), seatsPerRow: Number(config.seatsPerRow),
        }],
      });
      setMessage({ type: 'info', text: `تنظیم بلیت با شناسه ${id} ایجاد شد.` });
      setConfig(initialConfig);
    } catch (error) { setMessage({ type: 'error', text: error.message }); }
  };

  const field = (state, setter, name, label, type = 'number') => (
    <label>{label}<input required type={type} value={state[name]} onChange={(event) => setter({ ...state, [name]: event.target.value })} /></label>
  );

  return (
    <section className="container dashboard-main">
      <h1>ابزارهای مدیریت</h1>
      {message && <div className={`form-message ${message.type}`}>{message.text}</div>}

      <section className="dashboard-panel">
        <h2>کاربران</h2>
        <div className="profile-two-fields">
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="فیلتر ایمیل" />
          <button className="secondary-button" type="button" onClick={loadUsers}>جست‌وجو</button>
        </div>
        <div className="reports-list">
          {users.map((user) => (
            <article className="report-history-item" key={user.userId}>
              <div><strong>{user.firstName} {user.lastName}</strong><p>{user.email}</p></div>
              <button className={user.isActive ? 'danger-button' : 'primary-button'} type="button" onClick={() => toggleUser(user)}>
                {user.isActive ? 'غیرفعال‌کردن' : 'فعال‌کردن'}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-panel">
        <h2>ایجاد مسابقه</h2>
        <form className="profile-form-simple" onSubmit={submitMatch}>
          {field(match, setMatch, 'leagueId', 'شناسه لیگ')}
          {field(match, setMatch, 'venueId', 'شناسه ورزشگاه')}
          {field(match, setMatch, 'hostTeamId', 'شناسه تیم میزبان')}
          {field(match, setMatch, 'guestTeamId', 'شناسه تیم مهمان')}
          {field(match, setMatch, 'matchTime', 'زمان مسابقه', 'datetime-local')}
          <button className="primary-button" type="submit">ایجاد مسابقه</button>
        </form>
      </section>

      <section className="dashboard-panel">
        <h2>ایجاد تنظیم بلیت</h2>
        <form className="profile-form-simple" onSubmit={submitConfig}>
          {field(config, setConfig, 'matchId', 'شناسه مسابقه')}
          {field(config, setConfig, 'categoryId', 'شناسه دسته‌بندی')}
          {field(config, setConfig, 'price', 'قیمت')}
          {field(config, setConfig, 'section', 'بخش')}
          {field(config, setConfig, 'rowStart', 'ردیف شروع')}
          {field(config, setConfig, 'rowCount', 'تعداد ردیف')}
          {field(config, setConfig, 'seatsPerRow', 'صندلی در هر ردیف')}
          {field(config, setConfig, 'amenities', 'امکانات JSON', 'text')}
          <button className="primary-button" type="submit">ایجاد تنظیم بلیت</button>
        </form>
      </section>
    </section>
  );
}
