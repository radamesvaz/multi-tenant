<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useAuthStore } from '../../../shared/store';
import { useAdminHeaderSearch } from '../composables';
import './AdminSettingsPage.css';

const authStore = useAuthStore();
const { searchInput } = useAdminHeaderSearch();

const tenantSlug = computed(() => authStore.getActiveAdminTenantSlug());
const showInvitations = computed(() => authStore.isAdminForTenant(tenantSlug.value));

type SettingsCard = {
  key: string;
  title: string;
  description: string;
  to: { name: string };
  icon: string;
};

const cards = computed((): SettingsCard[] => {
  const items: SettingsCard[] = [
    {
      key: 'branding',
      title: 'Personalización',
      description: 'Logo, colores y WhatsApp de la tienda.',
      to: { name: 'admin-branding' },
      icon: '/icons/admin/branding.svg',
    },
  ];

  if (showInvitations.value) {
    items.push({
      key: 'invitations',
      title: 'Invitar usuario',
      description: 'Enviá invitaciones para nuevos administradores.',
      to: { name: 'admin-invitations' },
      icon: '/icons/admin/invite.svg',
    });
  }

  const q = searchInput.value.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (card) =>
      card.title.toLowerCase().includes(q) || card.description.toLowerCase().includes(q),
  );
});
</script>

<template>
  <div class="admin-settings">
    <p class="admin-settings__intro">
      Elegí una sección para configurar tu tienda.
    </p>

    <div v-if="cards.length === 0" class="admin-settings__empty">
      No hay resultados para «{{ searchInput.trim() }}».
    </div>

    <ul v-else class="admin-settings__grid">
      <li v-for="card in cards" :key="card.key">
        <RouterLink class="admin-settings__card" :to="card.to">
          <span class="admin-settings__card-icon" aria-hidden="true">
            <img :src="card.icon" alt="" width="22" height="22" />
          </span>
          <span class="admin-settings__card-body">
            <span class="admin-settings__card-title">{{ card.title }}</span>
            <span class="admin-settings__card-desc">{{ card.description }}</span>
          </span>
          <img
            class="admin-settings__card-chevron"
            src="/icons/admin/chevron-right.svg"
            alt=""
            width="18"
            height="18"
            aria-hidden="true"
          />
        </RouterLink>
      </li>
    </ul>
  </div>
</template>
