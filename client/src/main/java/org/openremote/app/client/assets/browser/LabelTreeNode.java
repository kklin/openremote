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
package org.openremote.app.client.assets.browser;

/**
 * This type is used when we have to stick a temporary node into the tree for
 * whatever reason, e.g. a loading message or some other UI signal for the user.
 */
public class LabelTreeNode extends BrowserTreeNode {

    public LabelTreeNode(String label) {
        super(label);
    }

    @Override
    public boolean isLeaf() {
        return true;
    }

    @Override
    public String getId() {
        return null;
    }
}
