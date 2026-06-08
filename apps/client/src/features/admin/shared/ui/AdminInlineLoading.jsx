import React from 'react';
import { FaSyncAlt } from 'react-icons/fa';

export default function AdminInlineLoading({ message }) {
  return (
    <div className="admin-state admin-state--inline">
      <FaSyncAlt className="spin" />
      <p>{message}</p>
    </div>
  );
}
