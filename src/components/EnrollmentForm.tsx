import React, { useState } from 'react';

interface CourseOption {
  id: string;
  title: string;
}

interface EnrollmentFormProps {
  courses: CourseOption[];
  onSubmit: (data: { name: string; email: string; courseId: string }) => void;
  loading?: boolean;
}

interface FormErrors {
  name?: string;
  email?: string;
  courseId?: string;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(124,58,237,0.3)',
  borderRadius: 10,
  color: '#f1f5f9',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s ease',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: '#a78bfa',
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 6,
};

const EnrollmentForm: React.FC<EnrollmentFormProps> = ({ courses, onSubmit, loading = false }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [courseId, setCourseId] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const validate = (): FormErrors => {
    const errs: FormErrors = {};
    if (!name.trim()) errs.name = 'Full name is required';
    if (!email.trim()) {
      errs.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = 'Enter a valid email address';
    }
    if (!courseId) errs.courseId = 'Please select a course';
    return errs;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    onSubmit({ name, email, courseId });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div
        role="status"
        style={{
          background: 'rgba(124,58,237,0.1)',
          border: '1px solid rgba(124,58,237,0.5)',
          borderRadius: 16,
          padding: 32,
          textAlign: 'center',
          color: '#f1f5f9',
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
        <h3 style={{ margin: '0 0 8px', color: '#a78bfa' }}>Enrollment Successful!</h3>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: 14 }}>
          Confirmation sent to <strong style={{ color: '#f1f5f9' }}>{email}</strong>
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Course Enrollment Form"
      noValidate
      style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #13133a 100%)',
        border: '1px solid rgba(124,58,237,0.4)',
        borderRadius: 16,
        padding: 28,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        boxShadow: '0 0 32px rgba(124,58,237,0.15)',
      }}
    >
      <h2 style={{ margin: 0, color: '#f1f5f9', fontSize: 20, fontWeight: 700 }}>
        Enroll in a Course
      </h2>

      <div>
        <label htmlFor="enroll-name" style={labelStyle}>Full Name</label>
        <input
          id="enroll-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Doe"
          aria-required="true"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
          style={{ ...inputStyle, borderColor: errors.name ? '#ef4444' : 'rgba(124,58,237,0.3)' }}
        />
        {errors.name && (
          <span id="name-error" role="alert" style={{ color: '#ef4444', fontSize: 12, marginTop: 4, display: 'block' }}>
            {errors.name}
          </span>
        )}
      </div>

      <div>
        <label htmlFor="enroll-email" style={labelStyle}>Email Address</label>
        <input
          id="enroll-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jane@example.com"
          aria-required="true"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          style={{ ...inputStyle, borderColor: errors.email ? '#ef4444' : 'rgba(124,58,237,0.3)' }}
        />
        {errors.email && (
          <span id="email-error" role="alert" style={{ color: '#ef4444', fontSize: 12, marginTop: 4, display: 'block' }}>
            {errors.email}
          </span>
        )}
      </div>

      <div>
        <label htmlFor="enroll-course" style={labelStyle}>Select Course</label>
        <select
          id="enroll-course"
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          aria-required="true"
          aria-invalid={!!errors.courseId}
          aria-describedby={errors.courseId ? 'course-error' : undefined}
          style={{
            ...inputStyle,
            borderColor: errors.courseId ? '#ef4444' : 'rgba(124,58,237,0.3)',
            appearance: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="">— Choose a course —</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id} style={{ background: '#1e1b4b' }}>
              {c.title}
            </option>
          ))}
        </select>
        {errors.courseId && (
          <span id="course-error" role="alert" style={{ color: '#ef4444', fontSize: 12, marginTop: 4, display: 'block' }}>
            {errors.courseId}
          </span>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        aria-busy={loading}
        style={{
          background: loading
            ? 'rgba(124,58,237,0.3)'
            : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          padding: '14px 0',
          fontWeight: 700,
          fontSize: 15,
          cursor: loading ? 'not-allowed' : 'pointer',
          boxShadow: loading ? 'none' : '0 0 20px rgba(124,58,237,0.5)',
          transition: 'all 0.2s ease',
        }}
      >
        {loading ? 'Enrolling...' : 'Enroll Now →'}
      </button>
    </form>
  );
};

export default EnrollmentForm;
