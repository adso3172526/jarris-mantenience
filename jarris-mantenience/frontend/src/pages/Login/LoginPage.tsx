import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Checkbox, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [form] = Form.useForm();
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cargar credenciales guardadas
  useEffect(() => {
    const saved = localStorage.getItem('jarris_saved_credentials');
    if (saved) {
      try {
        const { email, password } = JSON.parse(saved);
        form.setFieldsValue({ email, password, remember: true });
      } catch {
        localStorage.removeItem('jarris_saved_credentials');
      }
    }
  }, [form]);

  const onFinish = async (values: { email: string; password: string; remember?: boolean }) => {
    try {
      setLoading(true);

      // Guardar o eliminar credenciales según checkbox
      if (values.remember) {
        localStorage.setItem('jarris_saved_credentials', JSON.stringify({ email: values.email, password: values.password }));
      } else {
        localStorage.removeItem('jarris_saved_credentials');
      }

      const redirectPath = await login(values.email, values.password);
      navigate(redirectPath);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#2c3e50',
        padding: isMobile ? '20px' : '0',
      }}
    >
      <Card
        style={{
          width: isMobile ? '100%' : 400,
          maxWidth: isMobile ? '400px' : 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: isMobile ? 20 : 24 }}>
          <h1
            style={{
              fontSize: isMobile ? 28 : 32,
              fontWeight: 700,
              color: '#E60012',
              margin: 0,
              marginBottom: 8,
            }}
          >
            JARRIS
          </h1>
          <p style={{ color: '#8c8c8c', margin: 0, fontSize: isMobile ? 14 : 16 }}>
            Mantenimiento
          </p>
        </div>

        <Form
          form={form}
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          size={isMobile ? "large" : "large"}
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Por favor ingresa tu email' },
              { type: 'email', message: 'Email inválido' },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Email"
              style={{ fontSize: isMobile ? 16 : 14 }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Por favor ingresa tu contraseña' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Contraseña"
              style={{ fontSize: isMobile ? 16 : 14 }}
            />
          </Form.Item>

          <Form.Item name="remember" valuePropName="checked" style={{ marginBottom: 16 }}>
            <Checkbox>Recordar contraseña</Checkbox>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{ height: isMobile ? 48 : 42 }}
            >
              Iniciar Sesión
            </Button>
          </Form.Item>
        </Form>

        <div style={{ 
          textAlign: 'center', 
          fontSize: isMobile ? 11 : 12, 
          color: '#8c8c8c',
          marginTop: isMobile ? 16 : 8
        }}>
          © {new Date().getFullYear()} JARRIS - Mantenimiento
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;
