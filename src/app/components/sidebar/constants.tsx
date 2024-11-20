import AccountBoxIcon from './account-box.icon';
import AddToPhotosIcon from './add-to-photo.icon';
import BarChartIcon from './bar-chart.icon';
import EventNoteIcon from './event-note.icon';

const menus = [
  {
    id: 'account',
    title: 'アカウント',
    icon: <AccountBoxIcon />,
    subMenus: [
      { id: 'sub1', href: '/__TBD__', label: 'サブメニュー1' },
      { id: 'sub2', href: '/__TBD__', label: 'サブメニュー2' },
    ],
  },
  {
    id: 'record',
    title: '記録',
    icon: <BarChartIcon />,
    subMenus: [
      { id: 'sub1', href: '/__TBD__', label: 'サブメニュー1' },
      { id: 'sub2', href: '/__TBD__', label: 'サブメニュー2' },
      { id: 'sub3', href: '/__TBD__', label: 'サブメニュー3' },
      { id: 'sub4', href: '/__TBD__', label: 'サブメニュー4' },
    ],
  },
  {
    id: 'register',
    title: '登録',
    icon: <AddToPhotosIcon />,
    subMenus: [{ id: 'sub1', href: '/__TBD__', label: 'サブメニュー1' }],
  },
  {
    id: 'other',
    title: 'その他',
    icon: <EventNoteIcon />,
    subMenus: [
      { id: 'sub1', href: '/__TBD__', label: 'サブメニュー1' },
      { id: 'sub2', href: '/__TBD__', label: 'サブメニュー2' },
      { id: 'sub3', href: '/__TBD__', label: 'サブメニュー3' },
    ],
  },
] as const;

export default menus;
