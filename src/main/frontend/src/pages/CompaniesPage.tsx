import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Table, Button, Modal, Form, Input, Space, Popconfirm, message, Typography, Tag
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, FolderOpenOutlined } from '@ant-design/icons'
import { getCompanies, createCompany, updateCompany, deleteCompany } from '../api/client'
import type { Company } from '../types'

const { Title } = Typography

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Company | null>(null)
  const [form] = Form.useForm()
  const navigate = useNavigate()

  const load = async () => {
    setLoading(true)
    try { setCompanies(await getCompanies()) }
    catch (e: unknown) { message.error(String(e)) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openAdd = () => { setEditing(null); form.resetFields(); setModalOpen(true) }
  const openEdit = (c: Company) => { setEditing(c); form.setFieldsValue(c); setModalOpen(true) }

  const handleSave = async () => {
    const values = await form.validateFields()
    try {
      if (editing) {
        await updateCompany(editing.id, values)
        message.success('Firma güncellendi')
      } else {
        await createCompany(values)
        message.success('Firma eklendi')
      }
      setModalOpen(false)
      load()
    } catch (e: unknown) { message.error(String(e)) }
  }

  const handleDelete = async (id: number) => {
    try { await deleteCompany(id); message.success('Firma silindi'); load() }
    catch (e: unknown) { message.error(String(e)) }
  }

  const columns = [
    { title: 'Firma Adı', dataIndex: 'name', key: 'name', sorter: (a: Company, b: Company) => a.name.localeCompare(b.name) },
    { title: 'Vergi No', dataIndex: 'taxNumber', key: 'taxNumber' },
    { title: 'Sektör', dataIndex: 'sector', key: 'sector', render: (v: string) => v ? <Tag>{v}</Tag> : '-' },
    { title: 'Açıklama', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: 'İşlemler', key: 'actions', width: 200,
      render: (_: unknown, record: Company) => (
        <Space>
          <Button size="small" icon={<FolderOpenOutlined />} onClick={() => navigate(`/companies/${record.id}/statements`)}>
            Tablolar
          </Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm title="Firmayı silmek istediğinize emin misiniz?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Firmalar</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Yeni Firma</Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={companies}
        loading={loading}
        pagination={{ pageSize: 20 }}
      />

      <Modal
        title={editing ? 'Firmayı Düzenle' : 'Yeni Firma'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText="Kaydet"
        cancelText="İptal"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Firma Adı" rules={[{ required: true, message: 'Zorunlu alan' }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="taxNumber"
            label="Vergi No"
            rules={[
              { pattern: /^\d{10}$/, message: 'Vergi no 10 haneli rakamdan oluşmalıdır' },
            ]}
          >
            <Input
              maxLength={10}
              onKeyPress={e => { if (!/\d/.test(e.key)) e.preventDefault() }}
              placeholder="10 haneli vergi numarası"
            />
          </Form.Item>
          <Form.Item name="sector" label="Sektör">
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Açıklama">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
