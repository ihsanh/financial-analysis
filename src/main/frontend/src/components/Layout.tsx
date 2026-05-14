import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout as AntLayout, Menu } from 'antd'
import {
  BankOutlined,
  FileTextOutlined,
  CalculatorOutlined,
  ApartmentOutlined,
  BarChartOutlined,
} from '@ant-design/icons'

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
        <div style={{ color: '#fff', fontWeight: 700, fontSize: 16, padding: '16px 24px', borderBottom: '1px solid #333' }}>
          <FileTextOutlined style={{ marginRight: 8 }} />
          FinAnalysis
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
        <Header style={{ background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0', fontSize: 18, fontWeight: 600 }}>
          Finansal Analiz Platformu
        </Header>
        <Content style={{ margin: 24, background: '#fff', padding: 24, borderRadius: 8, minHeight: 'calc(100vh - 112px)' }}>
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  )
}
