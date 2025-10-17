from rest_framework import generics
from .models import HandbookSection
from .serializers import HandbookSectionSerializer


class HandbookSectionListView(generics.ListAPIView):
    queryset = HandbookSection.objects.all().order_by("order")
    serializer_class = HandbookSectionSerializer


class HandbookSectionDetailView(generics.RetrieveAPIView):
    queryset = HandbookSection.objects.all()
    serializer_class = HandbookSectionSerializer
    lookup_field = "key"
