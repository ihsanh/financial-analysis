import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout as AntLayout, Menu } from 'antd'
import {
  BankOutlined,
  CalculatorOutlined,
  ApartmentOutlined,
  BarChartOutlined,
} from '@ant-design/icons'
import Logo from './Logo'

const { Header, Sider, Content } = AntLayout

const menuItems = [
  { key: '/companies',        icon: <BankOutlined />,       label: 'Firmalar' },
  { key: '/ratio-rules',      icon: <CalculatorOutlined />,  label: 'Rasyo Kuralları' },
  { key: '/adjustment-rules', icon: <ApartmentOutlined />,   label: 'Aktarma / Arındırma' },
  { key: '/analysis',         icon: <BarChartOutlined />,    label: 'Analiz' },
]

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()

  const selectedKey = menuItems
    .map(i => i.key)
    .filter(k => location.pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0] ?? '/companies'

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider theme="dark" width={220} collapsible>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 18px', borderBottom: '1px solid #1a3a6b',
          background: 'linear-gradient(135deg, #0a1628 0%, #0d3b7a 100%)',
        }}>
          <Logo size={38} />
          <div>
            <div style={{ color: '#38d9f5', fontWeight: 800, fontSize: 14, lineHeight: 1.2, letterSpacing: 0.5 }}>
              FinAnalysis
            </div>
            <div style={{ color: '#5b8db8', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', marginTop: 1 }}>
              Deep Insight
            </div>
          </div>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ marginTop: 8 }}
        />
      </Sider>
      <AntLayout>
        <Header style={{
          background: '#fff', padding: '0 24px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <Logo size={28} />
          <span style={{ fontSize: 17, fontWeight: 700, color: '#0d3b7a', letterSpacing: 0.3 }}>
            Finansal Analiz Platformu
          </span>
          <span style={{
            marginLeft: 8, fontSize: 10, color: '#5b8db8',
            letterSpacing: 1.5, textTransform: 'uppercase',
            background: 'linear-gradient(135deg, #e8f4ff, #d0e8ff)',
            padding: '2px 8px', borderRadius: 10,
            border: '1px solid #b3d4f5',
          }}>
            Deep Insight
          </span>
        </Header>
        <Content style={{ margin: 24, background: '#fff', padding: 24, borderRadius: 8, minHeight: 'calc(100vh - 112px)' }}>
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  )
}
