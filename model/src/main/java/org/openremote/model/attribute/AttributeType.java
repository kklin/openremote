/*
 * Copyright 2017, OpenRemote Inc.
 *
 * See the CONTRIBUTORS.txt file in the distribution for a
 * full listing of individual contributors.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */
package org.openremote.model.attribute;

import org.openremote.model.value.Value;
import org.openremote.model.value.Values;

import java.util.Optional;

import static org.openremote.model.attribute.MetaItemType.*;

public enum AttributeType implements AttributeDescriptor {

    STRING("string", AttributeValueType.STRING),

    NUMBER("number", AttributeValueType.NUMBER),

    CONSOLE_NAME("consoleName", AttributeValueType.STRING),

    CONSOLE_VERSION("consoleVersion", AttributeValueType.STRING),

    CONSOLE_PLATFORM("consolePlatform", AttributeValueType.STRING),

    CONSOLE_PROVIDERS("consoleProviders", AttributeValueType.OBJECT),

    EMAIL("email", AttributeValueType.EMAIL, LABEL.withInitialValue(Values.create("Email"))),

    GEO_CITY("city", AttributeValueType.STRING,
            LABEL.withInitialValue(Values.create("City")),
            ABOUT.withInitialValue(Values.create("http://project-haystack.org/tag/geoCity"))),

    GEO_COUNTRY("country", AttributeValueType.STRING,
            LABEL.withInitialValue(Values.create("Country")),
            ABOUT.withInitialValue(Values.create("http://project-haystack.org/tag/geoCountry"))),

    GEO_POSTAL_CODE("postalCode", AttributeValueType.NUMBER,
            LABEL.withInitialValue(Values.create("Postal Code")),
            ABOUT.withInitialValue(Values.create("http://project-haystack.org/tag/geoPostalCode"))),

    GEO_STREET("street", AttributeValueType.STRING,
            LABEL.withInitialValue(Values.create("Street")),
            ABOUT.withInitialValue(Values.create("http://project-haystack.org/tag/geoStreet"))),

    LOCATION("location", AttributeValueType.GEO_JSON_POINT, LABEL.withInitialValue(Values.create("Location"))),

    SURFACE_AREA(
            "surfaceArea",
        AttributeValueType.NUMBER,
            LABEL.withInitialValue(Values.create("Surface Area")),
            DESCRIPTION.withInitialValue(Values.create("Floor area of building measured in m²")),
            ABOUT.withInitialValue(Values.create("http://project-haystack.org/tag/area")));


    final protected String attributeName;
    final protected AttributeValueDescriptor valueDescriptor;
    final protected Value initialValue;
    final protected MetaItemDescriptor[] metaItemDescriptors;

    AttributeType(String attributeName, AttributeValueDescriptor valueDescriptor, MetaItemDescriptor... metaItemDescriptors) {
        this(attributeName, valueDescriptor, null, metaItemDescriptors);
    }

    AttributeType(String attributeName, AttributeValueDescriptor valueDescriptor, Value initialValue, MetaItemDescriptor... metaItemDescriptors) {
        this.attributeName = attributeName;
        this.valueDescriptor = valueDescriptor;
        this.metaItemDescriptors = metaItemDescriptors;
        this.initialValue = initialValue;
    }

    public static Optional<AttributeDescriptor> getByValue(String name) {
        if (name == null)
            return Optional.empty();

        for (AttributeDescriptor descriptor : values()) {
            if (name.equals(descriptor.getAttributeName()))
                return Optional.of(descriptor);
        }
        return Optional.empty();
    }


    @Override
    public String getName() {
        return name();
    }

    @Override
    public String getAttributeName() {
        return attributeName;
    }

    @Override
    public AttributeValueDescriptor getValueDescriptor() {
        return valueDescriptor;
    }

    @Override
    public MetaItemDescriptor[] getMetaItemDescriptors() {
        return metaItemDescriptors;
    }

    @Override
    public Value getInitialValue() {
        return initialValue;
    }

    public AttributeDescriptor withName(String name, MetaItemDescriptor... metaItemDescriptors) {
        return withName(name, initialValue, metaItemDescriptors);
    }

    public AttributeDescriptor withName(String name, Value initialValue, MetaItemDescriptor... metaItemDescriptors) {

        return new AttributeDescriptorImpl(name, attributeName, valueDescriptor, metaItemDescriptors, initialValue);
    }
}
