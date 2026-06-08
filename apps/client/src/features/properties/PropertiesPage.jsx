import React from 'react';
import PropertiesLayout from './layout/PropertiesLayout';
import usePropertiesController from './usePropertiesController';
import '../../styles/Properties.css';

export default function PropertiesPage() {
  const properties = usePropertiesController();

  return (
    <PropertiesLayout
      catalog={properties.catalog}
      interactions={properties.interactions}
      propertiesData={properties.propertiesData}
    />
  );
}
