import { fetchBaseQuery, createApi } from '@reduxjs/toolkit/query/react';

const baseQuery = fetchBaseQuery({ baseUrl: '' });

export const apiSlice = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000',
    credentials: 'include',
    prepareHeaders: (headers, { extra, endpoint }) => {
      const token = localStorage.getItem('token');
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),

  tagTypes: ['User', 'Exam'],
  // it like a prent to other api
  // it a build in builder
  endpoints: (builder) => ({}),
});
