import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Layout, Menu, Typography, Input, Button, theme } from 'antd';
import {
  DashboardOutlined,
  FundOutlined,
  SearchOutlined,
  SettingOutlined,
} from '@ant-design/icons';

import Dashboard from './components/Dashboard';
import FundList from './components/FundList';
import FundDetail from './components/FundDetail';

const { Header, Content, Footer, Sider } = Layout;
const { Title } = Typography;
const { Search } = Input;

function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const {
    token: { colorBgContainer, colorBorderSecondary },
  } = theme.useToken();

  const handleSearch = (value) => {
    setSearchQuery(value);
    // 如果在FundList页面，搜索会触发重新加载
    // 这里只保存搜索关键词，实际搜索逻辑在FundList组件中实现
  };

  return (
    <Router>
      <Layout style={{ minHeight: '100vh' }}>
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
          style={{
            overflow: 'auto',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
          }}
        >
          <div style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)' }} />
          <Menu theme="dark" defaultSelectedKeys={['1']} mode="inline">
            <Menu.Item key="1" icon={<DashboardOutlined />}>
              <Link to="/">首页</Link>
            </Menu.Item>
            <Menu.Item key="2" icon={<FundOutlined />}>
              <Link to="/funds">基金列表</Link>
            </Menu.Item>
            <Menu.Item key="3" icon={<SettingOutlined />}>
              <Link to="/settings">设置</Link>
            </Menu.Item>
          </Menu>
        </Sider>

        <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'all 0.2s' }}>
          <Header
            style={{
              padding: 0,
              background: colorBgContainer,
              borderBottom: `1px solid ${colorBorderSecondary}`,
              position: 'sticky',
              top: 0,
              zIndex: 1,
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Title level={3} style={{ margin: '0 0 0 16px' }}>
              个人基金追踪系统
            </Title>
            <div style={{ marginRight: 16 }}>
              <Search
                placeholder="搜索基金代码或名称"
                allowClear
                enterButton={<Button type="primary" icon={<SearchOutlined />} />}
                size="large"
                onSearch={handleSearch}
                style={{ width: 300 }}
              />
            </div>
          </Header>

          <Content style={{ margin: '24px 16px', overflow: 'initial' }}>
            <div
              style={{
                padding: 24,
                minHeight: 360,
                background: colorBgContainer,
                borderRadius: 4,
              }}
            >
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/funds" element={<FundList searchQuery={searchQuery} />} />
                <Route path="/funds/:fundCode" element={<FundDetail />} />
                <Route path="/settings" element={<div>设置页面</div>} />
              </Routes>
            </div>
          </Content>

          <Footer style={{ textAlign: 'center' }}>
            个人基金追踪系统 ©{new Date().getFullYear()} Created with React & Ant Design
          </Footer>
        </Layout>
      </Layout>
    </Router>
  );
}

export default App;